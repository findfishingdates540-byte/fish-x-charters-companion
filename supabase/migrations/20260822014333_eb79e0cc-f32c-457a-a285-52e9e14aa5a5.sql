create or replace function public.reschedule_booking(_booking_id uuid, _slot_id uuid, _reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  old_slot public.service_availability;
  new_slot public.service_availability;
  dep timestamptz;
  hrs numeric;
  used int;
begin
  select * into b from public.bookings where id = _booking_id for update;
  if b.id is null then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.angler_id is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  if b.status not in ('confirmed','pending_confirmation') then
    raise exception 'RESCHEDULE_NOT_ALLOWED';
  end if;

  if b.slot_id is not null then
    select * into old_slot from public.service_availability where id = b.slot_id for update;
  end if;

  dep := coalesce(old_slot.starts_at, (b.trip_date + coalesce(b.start_time, time '06:00'))::timestamptz);
  hrs := extract(epoch from (dep - now())) / 3600.0;
  if hrs < 48 then raise exception 'RESCHEDULE_WINDOW_CLOSED'; end if;

  select count(*) into used from public.booking_transitions
    where booking_id = _booking_id and reason like 'reschedule%';
  if used >= 2 then raise exception 'RESCHEDULE_LIMIT'; end if;

  select * into new_slot from public.service_availability where id = _slot_id for update;
  if new_slot.id is null then raise exception 'SLOT_NOT_FOUND'; end if;
  if new_slot.service_id is distinct from b.service_id then raise exception 'SLOT_NOT_FOUND'; end if;
  if new_slot.id = b.slot_id then raise exception 'SLOT_SAME'; end if;
  if new_slot.is_blackout or new_slot.starts_at <= now() then raise exception 'SLOT_CONFLICT'; end if;
  if (new_slot.seats_available - new_slot.seats_booked) < b.party_size then raise exception 'SLOT_CONFLICT'; end if;
  if public.trip_block_conflict(b.service_id, new_slot.starts_at, new_slot.ends_at, new_slot.id) is not null then
    raise exception 'SLOT_CONFLICT';
  end if;

  if old_slot.id is not null then
    update public.service_availability
      set seats_booked = greatest(0, seats_booked - b.party_size),
          booked_booking_id = case when booked_booking_id = b.id then null else booked_booking_id end
    where id = old_slot.id;
  end if;

  update public.service_availability
    set seats_booked = seats_booked + b.party_size,
        booked_booking_id = coalesce(booked_booking_id, b.id)
  where id = new_slot.id;

  update public.bookings
    set slot_id = new_slot.id,
        trip_date = (new_slot.starts_at at time zone 'UTC')::date,
        start_time = (new_slot.starts_at at time zone 'UTC')::time,
        updated_at = now()
  where id = b.id
  returning * into b;

  insert into public.booking_transitions (booking_id, from_status, to_status, actor_id, actor_kind, reason, metadata)
  values (b.id, b.status, b.status, auth.uid(), 'angler', 'reschedule',
          jsonb_build_object('from_slot', old_slot.id, 'to_slot', new_slot.id,
                             'starts_at', new_slot.starts_at, 'note', _reason));

  perform public.emit_domain_event('booking.rescheduled', 'booking', b.id,
    jsonb_build_object('booking_id', b.id, 'slot_id', new_slot.id, 'starts_at', new_slot.starts_at), null);

  return b;
end;
$$;

revoke all on function public.reschedule_booking(uuid, uuid, text) from public, anon;
grant execute on function public.reschedule_booking(uuid, uuid, text) to authenticated;