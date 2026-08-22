-- Does another departure of the SAME operator overlap this window and already have booked seats?
CREATE OR REPLACE FUNCTION public.trip_block_conflict(
  _service_id uuid,
  _starts timestamptz,
  _ends timestamptz,
  _exclude_slot uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id
  FROM public.service_availability a
  JOIN public.bookable_services s2 ON s2.id = a.service_id
  JOIN public.bookable_services s1 ON s1.id = _service_id
  WHERE s2.business_id = s1.business_id
    AND s1.kind IN ('charter_trip','guided_trip')
    AND s2.kind IN ('charter_trip','guided_trip')
    AND a.id IS DISTINCT FROM _exclude_slot
    AND a.seats_booked > 0
    AND a.starts_at < _ends
    AND a.ends_at > _starts
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.trip_block_conflict(uuid, timestamptz, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trip_block_conflict(uuid, timestamptz, timestamptz, uuid) TO service_role;

-- Public bookable time blocks for one listing.
CREATE OR REPLACE FUNCTION public.public_service_slots(_service_id uuid)
RETURNS TABLE(
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  seats_available integer,
  seats_booked integer,
  price_cents integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.starts_at, a.ends_at, a.seats_available, a.seats_booked, a.price_cents
  FROM public.service_availability a
  JOIN public.bookable_services s ON s.id = a.service_id
  JOIN public.businesses b ON b.id = s.business_id
  WHERE a.service_id = _service_id
    AND s.is_published
    AND b.is_published
    AND NOT a.is_blackout
    AND a.starts_at > now()
    AND a.seats_available > a.seats_booked
    AND public.trip_block_conflict(_service_id, a.starts_at, a.ends_at, a.id) IS NULL
  ORDER BY a.starts_at
  LIMIT 180
$$;

GRANT EXECUTE ON FUNCTION public.public_service_slots(uuid) TO anon, authenticated, service_role;

-- Reserving a slot now claims the whole time block for that operator.
CREATE OR REPLACE FUNCTION public.reserve_slot(_slot_id uuid, _party_size integer, _idempotency_key text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _hold_minutes integer DEFAULT 15)
 RETURNS bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  slot public.service_availability;
  svc public.bookable_services;
  biz public.businesses;
  b public.bookings;
  rate numeric;
  drate numeric;
  total integer;
  deposit integer;
  balance integer;
  fee integer;
  payout integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _party_size IS NULL OR _party_size < 1 THEN
    RAISE EXCEPTION 'Party size must be at least 1' USING ERRCODE = '22023';
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT * INTO b FROM public.bookings
      WHERE idempotency_key = _idempotency_key AND angler_id = uid;
    IF FOUND THEN
      RETURN b;
    END IF;
  END IF;

  SELECT * INTO slot FROM public.service_availability WHERE id = _slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slot not found' USING ERRCODE = 'P0002';
  END IF;
  IF slot.is_blackout THEN
    RAISE EXCEPTION 'This date is not available' USING ERRCODE = '22023';
  END IF;
  IF slot.starts_at < now() THEN
    RAISE EXCEPTION 'This slot has already departed' USING ERRCODE = '22023';
  END IF;
  IF slot.seats_booked + _party_size > slot.seats_available THEN
    RAISE EXCEPTION 'Only % seat(s) left on this trip', slot.seats_available - slot.seats_booked
      USING ERRCODE = '23514';
  END IF;

  IF public.trip_block_conflict(slot.service_id, slot.starts_at, slot.ends_at, slot.id) IS NOT NULL THEN
    RAISE EXCEPTION 'This operator is already booked out during that time block — pick another departure.'
      USING ERRCODE = '23505';
  END IF;

  SELECT * INTO svc FROM public.bookable_services WHERE id = slot.service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO biz FROM public.businesses WHERE id = svc.business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0002';
  END IF;

  total   := COALESCE(slot.price_cents, svc.base_price_cents, 0) * _party_size;
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
    uid, biz.created_by, biz.id, svc.id, slot.id,
    (slot.starts_at AT TIME ZONE 'UTC')::date,
    (slot.starts_at AT TIME ZONE 'UTC')::time,
    _party_size,
    total, deposit, balance, payout, fee, rate,
    'pending_payment', 'none', svc.instant_book, _notes, _idempotency_key,
    now() + make_interval(mins => GREATEST(COALESCE(_hold_minutes, 15), 1)),
    CASE WHEN svc.instant_book THEN NULL
         ELSE now() + make_interval(hours => COALESCE(svc.accept_window_hours, 24)) END,
    jsonb_build_object('policy', COALESCE(svc.cancellation_policy, 'moderate'))
  )
  RETURNING * INTO b;

  UPDATE public.service_availability
     SET seats_booked = seats_booked + _party_size
   WHERE id = slot.id;

  INSERT INTO public.booking_holds (slot_id, booking_id, angler_id, expires_at)
  VALUES (slot.id, b.id, uid, b.hold_expires_at);

  PERFORM public.emit_domain_event(
    'booking.created', 'booking', b.id,
    jsonb_build_object(
      'booking_id', b.id, 'angler_id', uid, 'business_id', biz.id,
      'service_id', svc.id, 'slot_id', slot.id, 'party_size', _party_size,
      'instant_book', svc.instant_book,
      'total_cents', total, 'deposit_cents', deposit, 'balance_due_cents', balance
    )
  );

  RETURN b;
END;
$function$;