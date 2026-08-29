-- Charter Parent Entity
-- ---------------------------------------------------------------------------
-- Introduces a `charters` table as the marketplace listing parent.
-- Each charter can have multiple `bookable_services` rows (packages/variants).
-- Existing services are backfilled: one charter per existing service.
-- ---------------------------------------------------------------------------

-- 1. Create charters table
create table if not exists public.charters (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text,
  name text not null,
  description text,
  hero_url text,
  image_urls text[] not null default '{}',
  boat_id uuid references public.boats(id) on delete set null,
  water_type text,
  target_species text[] not null default '{}',
  departure_location text,
  duration_minutes int,
  capacity int not null default 4,
  base_price_cents int not null default 0,
  deposit_rate numeric(4,3) not null default 0.250,
  commission_rate numeric(4,3) not null default 0.150,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, slug)
);

create index if not exists charters_business_id_idx on public.charters(business_id);
create index if not exists charters_boat_id_idx on public.charters(boat_id);

alter table public.charters enable row level security;

-- Business team (owner/manager) manages charters
drop policy if exists "Charters: business team manages" on public.charters;
create policy "Charters: business team manages"
  on public.charters for all to authenticated
  using (public.is_business_member(business_id, auth.uid(), 'manager'))
  with check (public.is_business_member(business_id, auth.uid(), 'manager'));

-- Public can read published charters
drop policy if exists "Charters: public read published" on public.charters;
create policy "Charters: public read published"
  on public.charters for select to anon, authenticated
  using (is_published = true);

-- 2. Add charter_id to bookable_services
alter table public.bookable_services
  add column if not exists charter_id uuid references public.charters(id) on delete cascade;

create index if not exists bookable_services_charter_id_idx
  on public.bookable_services(charter_id);

-- 3. Data backfill: create one charter per existing service, link it
do $$
declare
  svc record;
  new_charter_id uuid;
begin
  for svc in
    select id, business_id, slug, title, description, hero_url, water_type,
           target_species, boat_id, duration_minutes, capacity,
           base_price_cents, departure_location
    from public.bookable_services
    where charter_id is null
  loop
    -- Use the service's slug if available, else generate from title
    insert into public.charters (
      business_id, slug, name, description, hero_url,
      water_type, target_species, boat_id, departure_location,
      duration_minutes, capacity, base_price_cents
    )
    values (
      svc.business_id,
      svc.slug,
      svc.title,
      svc.description,
      svc.hero_url,
      svc.water_type,
      svc.target_species,
      svc.boat_id,
      svc.departure_location,
      svc.duration_minutes,
      svc.capacity,
      svc.base_price_cents
    )
    returning id into new_charter_id;

    update public.bookable_services
      set charter_id = new_charter_id
      where id = svc.id;
  end loop;
end $$;

-- 4. Move recurring departure templates to charters (they're per-charter, not per-package)
-- Create new table charter_departure_times and migrate
create table if not exists public.charter_departure_times (
  id uuid primary key default gen_random_uuid(),
  charter_id uuid not null references public.charters(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  label text,
  start_time time not null,
  days_of_week smallint[] not null default '{}',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists charter_departure_times_charter_id_idx
  on public.charter_departure_times(charter_id);

alter table public.charter_departure_times enable row level security;

-- Public reads active departures of published charters
drop policy if exists "Public reads active charter departures" on public.charter_departure_times;
create policy "Public reads active charter departures"
  on public.charter_departure_times for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.charters c
      where c.id = charter_id and c.is_published
    )
  );

-- Business managers manage departure times
drop policy if exists "Business manages charter departures" on public.charter_departure_times;
create policy "Business manages charter departures"
  on public.charter_departure_times for all to authenticated
  using (public.is_business_member(business_id, auth.uid(), 'manager'))
  with check (public.is_business_member(business_id, auth.uid(), 'manager'));

grant select on public.charter_departure_times to anon;
grant select, insert, update, delete on public.charter_departure_times to authenticated;
grant all on public.charter_departure_times to service_role;

-- 5. Migrate existing service_departure_times to charter_departure_times
insert into public.charter_departure_times (charter_id, business_id, label, start_time, days_of_week, is_active, sort_order, created_at)
select
  s.charter_id,
  s.business_id,
  sdt.label,
  sdt.start_time,
  sdt.days_of_week,
  sdt.is_active,
  sdt.sort_order,
  sdt.created_at
from public.service_departure_times sdt
join public.bookable_services s on s.id = sdt.service_id
where s.charter_id is not null
on conflict do nothing;

-- 6. Add source column to service_availability if not already present (from Phase C)
alter table public.service_availability
  add column if not exists source text not null default 'manual';

-- 7. Grants
grant select on public.charters to anon;
grant select, insert, update, delete on public.charters to authenticated;
grant all on public.charters to service_role;

-- 8. Updated_at trigger
create trigger trg_charters_updated before update on public.charters
  for each row execute function public.update_updated_at_column();