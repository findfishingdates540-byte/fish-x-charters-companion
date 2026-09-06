create or replace function public.reserve_slip_stay(
  _service_id uuid,
  _start date,
  _end date,
  _idempotency_key text default null,
  _hold_minutes integer default 15
) returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  uid uuid := auth.uid();
  nights integer;
  svc public.bookable_services;
  biz public.businesses;
  slip public.marina_slips;
  b public.bookings;
  first_slot public.service_availability;
  cnt integer;
  nightly_total integer;
  monthly_total integer;
  total integer;
  rate numeric;
  drate numeric;
  deposit integer;
  balance integer;
  fee integer;
  payout integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  nights := _end - _start;
  IF nights IS NULL OR nights < 1 OR nights > 120 THEN
    RAISE EXCEPTION 'Choose between 1 and 120 nights' USING ERRCODE = '22023';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO b FROM public.bookings
      WHERE idempotency_key = _idempotency_key AND angler_id = uid;
    IF FOUND THEN
      RETURN b;
    END IF;
  END IF;

  SELECT * INTO svc FROM public.bookable_services WHERE id = _service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found' USING ERRCODE = 'P0002';
  END IF;
  IF svc.kind <> 'slip_rental'::public.service_kind THEN
    RAISE EXCEPTION 'Multi-night stays apply to slip rentals only' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO biz FROM public.businesses WHERE id = svc.business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0002';
  END IF;

  -- Release the caller's own unpaid hold so seats are never double counted.
  UPDATE public.bookings
     SET status = 'expired', hold_expires_at = now(), updated_at = now()
   WHERE angler_id = uid AND status = 'pending_payment';

  PERFORM 1 FROM public.service_availability
   WHERE service_id = _service_id
     AND (starts_at AT TIME ZONE 'UTC')::date >= _start
     AND (starts_at AT TIME ZONE 'UTC')::date < _end
   FOR UPDATE;

  SELECT count(*), COALESCE(sum(COALESCE(price_cents, svc.base_price_cents, 0)), 0)
    INTO cnt, nightly_total
    FROM public.service_availability
   WHERE service_id = _service_id
     AND (starts_at AT TIME ZONE 'UTC')::date >= _start
     AND (starts_at AT TIME ZONE 'UTC')::date < _end
     AND is_blackout = false
     AND seats_booked + 1 <= seats_available;

  IF cnt <> nights THEN
    RAISE EXCEPTION 'Some nights in that stay are already taken — pick another arrival or a shorter stay'
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO first_slot FROM public.service_availability
   WHERE service_id = _service_id
     AND (starts_at AT TIME ZONE 'UTC')::date = _start
   LIMIT 1;
  IF first_slot.starts_at < now() THEN
    RAISE EXCEPTION 'That arrival date has already passed' USING ERRCODE = '22023';
  END IF;

  total := nightly_total;
  SELECT * INTO slip FROM public.marina_slips WHERE service_id = _service_id LIMIT 1;
  IF FOUND AND nights >= 28 AND COALESCE(slip.monthly_rate_cents, 0) > 0 THEN
    monthly_total := ROUND(slip.monthly_rate_cents::numeric / 30.0 * nights);
    IF monthly_total < total THEN
      total := monthly_total;
    END IF;
  END IF;

  rate    := COALESCE(biz.commission_rate, 0.15);
  drate   := LEAST(GREATEST(COALESCE(biz.deposit_rate, 0.25), rate), 1.0);
  deposit := ROUND(total * drate);
  balance := total - deposit;
  fee     := LEAST(ROUND(total * rate), deposit);
  payout  := deposit - fee;

  INSERT INTO public.bookings (
    angler_id, captain_id, business_id, service_id, slot_id,
    trip_date, start_time, party_size,
    total_cents, deposit_cents, balance_due_cents, payout_cents, application_fee_cents, commission_rate,
    status, escrow_state, instant_book, notes, idempotency_key,
    hold_expires_at, accept_deadline_at, cancellation_policy
  ) VALUES (
    uid, biz.created_by, biz.id, svc.id, first_slot.id,
    _start,
    (first_slot.starts_at AT TIME ZONE 'UTC')::time,
    1,
    total, deposit, balance, payout, fee, rate,
    'pending_payment', 'none', svc.instant_book,
    format('Slip stay %s to %s (%s night(s))', _start, _end, nights),
    _idempotency_key,
    now() + make_interval(mins => GREATEST(COALESCE(_hold_minutes, 15), 1)),
    CASE WHEN svc.instant_book THEN NULL
         ELSE now() + make_interval(hours => COALESCE(svc.accept_window_hours, 24)) END,
    jsonb_build_object('policy', COALESCE(svc.cancellation_policy, 'moderate'),
                       'stay_start', _start, 'stay_end', _end, 'nights', nights)
  )
  RETURNING * INTO b;

  UPDATE public.service_availability
     SET seats_booked = seats_booked + 1
   WHERE service_id = _service_id
     AND (starts_at AT TIME ZONE 'UTC')::date >= _start
     AND (starts_at AT TIME ZONE 'UTC')::date < _end;

  INSERT INTO public.booking_holds (slot_id, booking_id, angler_id, expires_at)
  VALUES (first_slot.id, b.id, uid, b.hold_expires_at);

  PERFORM public.emit_domain_event(
    'booking.created', 'booking', b.id,
    jsonb_build_object(
      'booking_id', b.id, 'angler_id', uid, 'business_id', biz.id,
      'service_id', svc.id, 'slot_id', first_slot.id, 'nights', nights,
      'stay_start', _start, 'stay_end', _end,
      'total_cents', total, 'deposit_cents', deposit, 'balance_due_cents', balance
    )
  );

  RETURN b;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_slip_stay(uuid, date, date, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_slip_stay(uuid, date, date, text, integer) TO authenticated;