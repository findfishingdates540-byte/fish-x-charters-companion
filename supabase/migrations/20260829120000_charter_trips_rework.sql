-- Charter Trips rework
-- ---------------------------------------------------------------------------
-- Adds the schema the captain-facing "Charter Trips" flow needs:
--   1. bookable_services: water_type + a link to a boat from the fleet
--   2. boats: business scoping (the table was captain_id-only & unused) + a
--      photo gallery (image_urls[]) on top of the single hero_image_url
--   3. service_departure_times: recurring weekly departure templates that the
--      availability generator materialises into service_availability
--   4. service_availability.source: lets the generator own its own slots
--      ('departure_template') without ever touching manually-added dates
--      ('manual') or booked slots.
--
-- RLS mirrors the existing service_addons / bookable_services policies:
--   * business managers (owner/manager) manage rows for their business_id
--   * the public can read rows that belong to a published listing
-- No add-on tables are created (the reuse model copies per-trip rows), and the
-- reserve_slot booking RPC is deliberately left untouched.
-- ---------------------------------------------------------------------------

-- 1. Charter trip: water type + boat link ----------------------------------
alter table public.bookable_services
  add column if not exists water_type text,
  add column if not exists boat_id uuid references public.boats(id) on delete set null;
create index if not exists bookable_services_boat_id_idx
  on public.bookable_services(boat_id);

-- 2. Boats: business scoping + photo gallery -------------------------------
alter table public.boats
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists image_urls text[] not null default '{}';
create index if not exists boats_business_id_idx on public.boats(business_id);

-- Business team (owner/manager of business_id) can manage boats, in addition
-- to the existing "captain manages own" policy (both are permissive / OR-ed).
drop policy if exists "Boats: business team manages" on public.boats;
create policy "Boats: business team manages"
  on public.boats for all to authenticated
  using (business_id is not null and public.is_business_member(business_id, auth.uid(), 'manager'))
  with check (business_id is not null and public.is_business_member(business_id, auth.uid(), 'manager'));

-- Anglers can read a boat once it's attached to a published charter.
drop policy if exists "Boats: public read for published listings" on public.boats;
create policy "Boats: public read for published listings"
  on public.boats for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.bookable_services s
      where s.boat_id = boats.id and s.is_published
    )
  );

grant select on public.boats to anon;

-- 3. Recurring weekly departure templates ----------------------------------
create table if not exists public.service_departure_times (
  id uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.bookable_services(id) on delete cascade,
  business_id  uuid references public.businesses(id) on delete cascade,
  label        text,                              -- "Morning"
  start_time   time not null,                     -- 07:00 (operator local wall-clock)
  days_of_week smallint[] not null default '{}',  -- 0=Sun .. 6=Sat
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists service_departure_times_service_id_idx
  on public.service_departure_times(service_id);

alter table public.service_departure_times enable row level security;

-- Public can read departures of published listings (mirror service_addons).
drop policy if exists "Public can read departures of published listings" on public.service_departure_times;
create policy "Public can read departures of published listings"
  on public.service_departure_times for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.bookable_services s
      where s.id = service_id and s.is_published
    )
  );

-- Business managers manage departure times (mirror service_addons).
drop policy if exists "Business managers manage departure times" on public.service_departure_times;
create policy "Business managers manage departure times"
  on public.service_departure_times for all to authenticated
  using (public.is_business_member(business_id, auth.uid(), 'manager'))
  with check (public.is_business_member(business_id, auth.uid(), 'manager'));

grant select on public.service_departure_times to anon;
grant select, insert, update, delete on public.service_departure_times to authenticated;
grant all on public.service_departure_times to service_role;

-- 4. Availability provenance ------------------------------------------------
-- 'manual' = added by the operator's calendar; 'departure_template' = owned by
-- the recurring-departure generator, which may prune/rebuild its own slots.
alter table public.service_availability
  add column if not exists source text not null default 'manual';
