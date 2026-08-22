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
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002'; END IF;

  -- Callable only by trusted server code (service_role); when a session is
  -- present it must belong to the angler on the booking or an admin.
  IF auth.uid() IS NOT NULL
     AND b.angler_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO existing FROM public.booking_addons WHERE booking_id = _booking_id;
  IF existing > 0 THEN RETURN; END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(COALESCE(_lines, '[]'::jsonb))
  LOOP
    SELECT * INTO a FROM public.service_addons WHERE id = (line->>'addon_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ADDON_UNAVAILABLE: This extra is no longer offered.' USING ERRCODE = '23514';
    END IF;
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

REVOKE EXECUTE ON FUNCTION public.reserve_booking_addons(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_booking_addons(uuid, jsonb) TO service_role;