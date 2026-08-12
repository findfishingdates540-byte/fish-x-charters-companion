-- ============ Fee structure: charters 15% commission on a 25% deposit ============

ALTER TABLE public.businesses
  ALTER COLUMN commission_rate SET DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS deposit_rate numeric NOT NULL DEFAULT 0.25,
  ADD COLUMN IF NOT EXISTS product_commission_rate numeric NOT NULL DEFAULT 0.08;

UPDATE public.businesses SET commission_rate = 0.15 WHERE commission_rate = 0.20;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS balance_due_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_collected_at timestamptz;

-- Existing bookings were charged in full; no on-boat balance for them.
UPDATE public.bookings SET balance_due_cents = 0 WHERE balance_due_cents IS NULL;

-- ============ reserve_slot: charge the deposit only ============

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

-- ============ Payout window: captain paid 3 days after the trip ============

CREATE OR REPLACE FUNCTION public.set_escrow_hold_window()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.dispute_window_ends_at := COALESCE(NEW.completed_at, now()) + interval '72 hours';
    IF NEW.escrow_state = 'none' THEN
      NEW.escrow_state := 'held';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_due_booking_payouts(_limit integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT id, business_id, payout_cents FROM public.bookings
     WHERE status IN ('completed','reviewed')
       AND escrow_state = 'held'
       AND payout_released_at IS NULL
       AND COALESCE(dispute_window_ends_at, completed_at + interval '72 hours') < now()
     ORDER BY completed_at
     LIMIT GREATEST(COALESCE(_limit, 200), 1)
  LOOP
    UPDATE public.bookings
       SET escrow_state = 'released', payout_released_at = now(), updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.payouts (business_id, booking_id, amount_cents, status)
    VALUES (r.business_id, r.id, COALESCE(r.payout_cents, 0), 'pending');

    PERFORM public.emit_domain_event('payout.released', 'booking', r.id,
      jsonb_build_object('booking_id', r.id, 'amount_cents', COALESCE(r.payout_cents, 0)));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;

-- ============ Merchandise: 8% commission, released 3 days after delivery ============

ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_due_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_product_order_delivered(_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o public.product_orders%rowtype;
BEGIN
  SELECT * INTO o FROM public.product_orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT (o.buyer_id = auth.uid()
          OR public.is_business_member(o.business_id, auth.uid(), 'staff'::public.business_member_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.product_orders
     SET delivered_at = COALESCE(delivered_at, now()),
         payout_due_at = COALESCE(payout_due_at, now() + interval '72 hours'),
         status = CASE WHEN status IN ('paid','shipped') THEN 'delivered' ELSE status END,
         updated_at = now()
   WHERE id = _order_id;

  PERFORM public.emit_domain_event('order.delivered', 'product_order', _order_id,
    jsonb_build_object('order_id', _order_id));
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_delivered_product_payouts(_limit integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT id, business_id, payout_cents FROM public.product_orders
     WHERE delivered_at IS NOT NULL
       AND payout_released_at IS NULL
       AND COALESCE(payout_due_at, delivered_at + interval '72 hours') < now()
     ORDER BY delivered_at
     LIMIT GREATEST(COALESCE(_limit, 200), 1)
  LOOP
    UPDATE public.product_orders
       SET payout_released_at = now(), updated_at = now()
     WHERE id = r.id;

    INSERT INTO public.payouts (business_id, amount_cents, status)
    VALUES (r.business_id, COALESCE(r.payout_cents, 0), 'pending');

    PERFORM public.emit_domain_event('order.payout_released', 'product_order', r.id,
      jsonb_build_object('order_id', r.id, 'amount_cents', COALESCE(r.payout_cents, 0)));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;