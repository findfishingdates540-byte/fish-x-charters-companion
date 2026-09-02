-- 1. Blockouts: enforce business membership inside the definer function.
CREATE OR REPLACE FUNCTION public.apply_blockout_slots(_business_id uuid, _start_date date, _end_date date, _block boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.is_business_member(_business_id, auth.uid(), 'manager'::public.business_member_role)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.service_availability sa
     SET is_blackout = _block
   WHERE sa.service_id IN (
     SELECT id FROM public.bookable_services bs
      WHERE bs.business_id = _business_id AND bs.is_published
   )
   AND sa.starts_at::date >= _start_date
   AND sa.starts_at::date <= _end_date
   AND (sa.seats_booked IS NULL OR sa.seats_booked = 0);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.apply_blockout_slots(uuid, date, date, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apply_blockout_slots(uuid, date, date, boolean) TO authenticated, service_role;

-- 2. Booking add-ons: require a signed-in caller (service_role bypasses auth.uid()).
CREATE OR REPLACE FUNCTION public.reserve_booking_addons(_booking_id uuid, _lines jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF auth.uid() IS NULL AND current_setting('role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.reserve_booking_addons(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reserve_booking_addons(uuid, jsonb) TO authenticated, service_role;

-- 3. Internal cron config: explicit deny-all policy (service_role bypasses RLS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'private' AND c.relname = 'cron_config'
  ) THEN
    EXECUTE 'CREATE POLICY "No client access to cron config" ON private.cron_config FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)';
  END IF;
END $$;