-- ---------------------------------------------------------------
-- Phase 1: slot inventory, soft holds, hard lock, idempotency
-- ---------------------------------------------------------------

ALTER TABLE public.service_availability
  ADD COLUMN IF NOT EXISTS seats_booked integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_cents integer,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.service_availability
  DROP CONSTRAINT IF EXISTS service_availability_seats_ck;
ALTER TABLE public.service_availability
  ADD CONSTRAINT service_availability_seats_ck
  CHECK (seats_booked >= 0 AND seats_booked <= seats_available);

ALTER TABLE public.bookable_services
  ADD COLUMN IF NOT EXISTS instant_book boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accept_window_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS cancellation_policy text NOT NULL DEFAULT 'moderate';

ALTER TABLE public.bookable_services
  DROP CONSTRAINT IF EXISTS bookable_services_cancellation_policy_ck;
ALTER TABLE public.bookable_services
  ADD CONSTRAINT bookable_services_cancellation_policy_ck
  CHECK (cancellation_policy IN ('flexible','moderate','strict'));

CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_uidx
  ON public.bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_hold_expiry_idx
  ON public.bookings (hold_expires_at) WHERE status = 'pending_payment';

CREATE INDEX IF NOT EXISTS bookings_accept_deadline_idx
  ON public.bookings (accept_deadline_at) WHERE status = 'pending_confirmation';

CREATE INDEX IF NOT EXISTS service_availability_service_start_idx
  ON public.service_availability (service_id, starts_at);

-- Statuses that free the seats back to inventory
CREATE OR REPLACE FUNCTION public.booking_status_releases_seats(_s public.booking_status)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT _s IN ('expired','declined','cancelled_angler','cancelled_captain','refunded','weather_cancelled')
$$;

-- Reserve a slot atomically: lock row, assert seats, create booking + hold
CREATE OR REPLACE FUNCTION public.reserve_slot(
  _slot_id uuid,
  _party_size integer,
  _idempotency_key text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _hold_minutes integer DEFAULT 15
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  slot public.service_availability;
  svc public.bookable_services;
  biz public.businesses;
  b public.bookings;
  rate numeric;
  total integer;
  fee integer;
  payout integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF _party_size IS NULL OR _party_size < 1 THEN
    RAISE EXCEPTION 'Party size must be at least 1' USING ERRCODE = '22023';
  END IF;

  -- Idempotency: a retried request returns the original booking
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

  SELECT * INTO svc FROM public.bookable_services WHERE id = slot.service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO biz FROM public.businesses WHERE id = svc.business_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found' USING ERRCODE = 'P0002';
  END IF;

  total := COALESCE(slot.price_cents, svc.base_price_cents, 0);
  rate := COALESCE(biz.commission_rate, 0.20);
  fee := ROUND(total * rate);
  payout := total - fee;

  INSERT INTO public.bookings (
    angler_id, captain_id, business_id, service_id, slot_id,
    trip_date, start_time, party_size,
    total_cents, deposit_cents, payout_cents, application_fee_cents, commission_rate,
    status, escrow_state, instant_book, notes, idempotency_key,
    hold_expires_at, accept_deadline_at, cancellation_policy
  ) VALUES (
    uid, biz.created_by, biz.id, svc.id, slot.id,
    (slot.starts_at AT TIME ZONE 'UTC')::date,
    (slot.starts_at AT TIME ZONE 'UTC')::time,
    _party_size,
    total, 0, payout, fee, rate,
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
      'instant_book', svc.instant_book, 'total_cents', total
    )
  );

  RETURN b;
END;
$$;

-- Give the seats back whenever a booking leaves the inventory
CREATE OR REPLACE FUNCTION public.release_slot_seats_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slot_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.booking_status_releases_seats(NEW.status)
     AND NOT public.booking_status_releases_seats(OLD.status) THEN
    UPDATE public.service_availability
       SET seats_booked = GREATEST(seats_booked - COALESCE(NEW.party_size, 0), 0)
     WHERE id = NEW.slot_id;
    UPDATE public.booking_holds
       SET released_at = now()
     WHERE booking_id = NEW.id AND released_at IS NULL;
  ELSIF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    -- Hard lock: hold is consumed, seats stay counted against the slot
    UPDATE public.booking_holds
       SET released_at = now()
     WHERE booking_id = NEW.id AND released_at IS NULL;
    UPDATE public.service_availability
       SET booked_booking_id = COALESCE(booked_booking_id, NEW.id)
     WHERE id = NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_release_seats ON public.bookings;
CREATE TRIGGER trg_bookings_release_seats
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.release_slot_seats_on_status();

-- Expire abandoned checkouts (called by the hold-expiry cron)
CREATE OR REPLACE FUNCTION public.expire_stale_holds(_limit integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.bookings
     WHERE status = 'pending_payment'
       AND hold_expires_at IS NOT NULL
       AND hold_expires_at < now()
     ORDER BY hold_expires_at
     LIMIT GREATEST(COALESCE(_limit, 200), 1)
  LOOP
    UPDATE public.bookings
       SET status = 'expired', updated_at = now()
     WHERE id = r.id AND status = 'pending_payment';

    INSERT INTO public.booking_transitions (booking_id, from_status, to_status, actor_kind, reason)
    VALUES (r.id, 'pending_payment', 'expired', 'system', 'hold_timeout');

    PERFORM public.emit_domain_event('booking.expired', 'booking', r.id,
      jsonb_build_object('booking_id', r.id, 'reason', 'hold_timeout'));

    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;