ALTER TABLE public.service_addons
  ADD COLUMN IF NOT EXISTS max_per_booking integer,
  ADD COLUMN IF NOT EXISTS capacity_per_slot integer,
  ADD COLUMN IF NOT EXISTS lead_time_hours integer NOT NULL DEFAULT 0;

-- How many units of an add-on are still sellable on a given departure.
-- Returns NULL when the add-on has no per-departure cap.
CREATE OR REPLACE FUNCTION public.addon_remaining_for_slot(_addon_id uuid, _slot_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN a.capacity_per_slot IS NULL THEN NULL
    ELSE GREATEST(a.capacity_per_slot - COALESCE((
      SELECT SUM(ba.quantity)
      FROM public.booking_addons ba
      JOIN public.bookings b ON b.id = ba.booking_id
      WHERE ba.addon_id = a.id
        AND b.slot_id = _slot_id
        AND NOT public.booking_status_releases_seats(b.status)
    ), 0), 0)::integer
  END
  FROM public.service_addons a
  WHERE a.id = _addon_id
$$;

-- Human-readable reason an add-on cannot be sold, or NULL when it can.
CREATE OR REPLACE FUNCTION public.addon_block_reason(_addon_id uuid, _slot_id uuid, _quantity integer)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a public.service_addons;
  s public.service_availability;
  remaining integer;
BEGIN
  SELECT * INTO a FROM public.service_addons WHERE id = _addon_id;
  IF NOT FOUND THEN RETURN 'This extra is no longer offered.'; END IF;
  IF NOT a.is_active THEN RETURN a.title || ' is no longer offered.'; END IF;

  SELECT * INTO s FROM public.service_availability WHERE id = _slot_id;
  IF NOT FOUND THEN RETURN 'That departure is no longer available.'; END IF;
  IF a.service_id IS DISTINCT FROM s.service_id THEN
    RETURN a.title || ' is not offered on this trip.';
  END IF;

  IF COALESCE(a.lead_time_hours, 0) > 0
     AND s.starts_at < now() + make_interval(hours => a.lead_time_hours) THEN
    RETURN a.title || ' must be booked at least ' || a.lead_time_hours || 'h before departure.';
  END IF;

  IF a.max_per_booking IS NOT NULL AND _quantity > a.max_per_booking THEN
    RETURN a.title || ' is limited to ' || a.max_per_booking || ' per booking.';
  END IF;

  remaining := public.addon_remaining_for_slot(_addon_id, _slot_id);
  IF remaining IS NOT NULL AND _quantity > remaining THEN
    RETURN CASE WHEN remaining = 0
      THEN a.title || ' is fully booked on this departure.'
      ELSE 'Only ' || remaining || ' left of ' || a.title || ' on this departure.' END;
  END IF;

  RETURN NULL;
END;
$$;

-- Atomic add-on reservation: validates every line against the departure and
-- writes the booking_addons rows in one transaction. Idempotent per booking.
CREATE OR REPLACE FUNCTION public.reserve_booking_addons(_booking_id uuid, _lines jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  b public.bookings;
  line jsonb;
  a public.service_addons;
  qty integer;
  reason text;
  existing integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;
  IF b.angler_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO existing FROM public.booking_addons WHERE booking_id = _booking_id;
  IF existing > 0 THEN RETURN; END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(COALESCE(_lines, '[]'::jsonb))
  LOOP
    SELECT * INTO a FROM public.service_addons WHERE id = (line->>'addon_id')::uuid FOR UPDATE;
    qty := GREATEST(COALESCE((line->>'quantity')::int, 1), 1);

    reason := public.addon_block_reason(a.id, b.slot_id, qty);
    IF reason IS NOT NULL THEN
      RAISE EXCEPTION 'ADDON_UNAVAILABLE: %', reason USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.booking_addons (booking_id, addon_id, title, unit, unit_price_cents, quantity, total_cents)
    VALUES (_booking_id, a.id, a.title, a.unit, a.price_cents, qty, a.price_cents * qty);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.addon_remaining_for_slot(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.addon_block_reason(uuid, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserve_booking_addons(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.addon_remaining_for_slot(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.addon_block_reason(uuid, uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_booking_addons(uuid, jsonb) TO service_role;