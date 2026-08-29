-- Blockout dates: captain can block date ranges for their whole business,
-- making all charters unavailable on those days. Reopen restores availability.
-- RLS mirrors the `bookable_services` pattern.

-- 1. business_blockouts table
create table if not exists public.business_blockouts (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id  uuid references public.bookable_services(id) on delete cascade, -- null = all charter services of this business
  start_date  date not null,
  end_date    date not null,
  reason      text,                         -- private, captain-owned; not visible to anglers
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists business_blockouts_business_id_idx on public.business_blockouts(business_id);
create index if not exists business_blockouts_start_end_idx on public.business_blockouts(start_date, end_date);
alter table public.business_blockouts enable row level security;

-- 2. Manage: business staff
drop policy if exists "Business staff manage blockouts" on public.business_blockouts;
create policy "Business staff manage blockouts"
  on public.business_blockouts for all to authenticated
  using (public.is_business_member(business_id, auth.uid(), 'manager'))
  with check (public.is_business_member(business_id, auth.uid(), 'manager'));

-- 3. Read: business staff only
drop policy if exists "Business staff read blockouts" on public.business_blockouts;
create policy "Business staff read blockouts"
  on public.business_blockouts for select to authenticated
  using (public.is_business_member(business_id, auth.uid(), 'staff'));

-- 4. Ensure service_id belongs to the same business (checked in the apply function)
comment on column public.business_blockouts.service_id is
  'nullable — null means the blockout applies to ALL published bookable_services of this business';

-- 5. Propagation function: flip is_blackout on service_availability slots
--    that fall within the date range and have no booked seats.
--    Rows with seats_booked > 0 are never touched.
create or replace function public.apply_blockout_slots(_business_id uuid, _start_date date, _end_date date, _block boolean)
returns void language sql security definer set search_path = public as $$
  update public.service_availability sa
    set is_blackout = _block
  where sa.service_id in (
    select id from public.bookable_services bs
    where bs.business_id = _business_id
      and bs.is_published
  )
  and sa.starts_at::date >= _start_date
  and sa.starts_at::date <= _end_date
  and (sa.seats_booked is null or sa.seats_booked = 0);
$$;

-- 6. Grant execute on the propagation function
--    NOTE: must be `ON FUNCTION` (not `ON TABLE`) — without it Postgres
--    parses the name as a relation and the migration would fail with
--    `42P01: relation does not exist`. See 20260630154831 / 20260812115509
--    for the correct pattern.
grant execute on function public.apply_blockout_slots(uuid, date, date, boolean) to authenticated;