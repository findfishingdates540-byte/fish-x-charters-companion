
-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Allowed transition graph (marketplace deep spec)
CREATE OR REPLACE FUNCTION public.is_allowed_booking_transition(
  _from public.booking_status,
  _to public.booking_status
) RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _from IS NULL THEN _to IN ('inquiry','pending_payment')
    WHEN _from = 'inquiry' THEN _to IN ('pending_payment','declined','expired')
    WHEN _from = 'pending_payment' THEN _to IN ('pending_confirmation','confirmed','expired','cancelled_angler')
    WHEN _from = 'pending_confirmation' THEN _to IN ('confirmed','declined','expired','cancelled_angler')
    WHEN _from = 'confirmed' THEN _to IN ('in_progress','cancelled_angler','cancelled_captain','weather_cancelled','no_show')
    WHEN _from = 'in_progress' THEN _to IN ('completed','disputed','weather_cancelled')
    WHEN _from = 'completed' THEN _to IN ('reviewed','disputed','refunded')
    WHEN _from = 'reviewed' THEN _to IN ('disputed')
    WHEN _from = 'disputed' THEN _to IN ('refunded','completed')
    WHEN _from IN ('declined','expired','cancelled_angler','cancelled_captain','no_show','refunded','weather_cancelled') THEN false
    ELSE false
  END
$$;

-- Booking transition RPC
CREATE OR REPLACE FUNCTION public.transition_booking(
  _booking_id uuid,
  _to_status public.booking_status,
  _reason text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b public.bookings;
  actor uuid := auth.uid();
  actor_kind text := 'user';
  authorized boolean := false;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  -- Authorization
  IF b.angler_id = actor THEN
    authorized := true; actor_kind := 'angler';
  ELSIF b.business_id IS NOT NULL AND public.is_business_member(b.business_id, actor, 'staff'::public.business_member_role) THEN
    authorized := true; actor_kind := 'captain';
  ELSIF public.has_role(actor, 'admin'::public.app_role) THEN
    authorized := true; actor_kind := 'admin';
  END IF;

  IF NOT authorized THEN
    RAISE EXCEPTION 'Not authorized to transition this booking' USING ERRCODE = '42501';
  END IF;

  IF b.status = _to_status THEN
    RETURN b;
  END IF;

  IF NOT public.is_allowed_booking_transition(b.status, _to_status) THEN
    RAISE EXCEPTION 'Illegal transition % -> %', b.status, _to_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
     SET status = _to_status,
         updated_at = now(),
         completed_at = CASE WHEN _to_status = 'completed' THEN now() ELSE completed_at END
   WHERE id = _booking_id
   RETURNING * INTO b;

  INSERT INTO public.booking_transitions (booking_id, from_status, to_status, actor_id, actor_kind, reason, metadata)
  VALUES (_booking_id, (SELECT status FROM public.booking_transitions WHERE booking_id = _booking_id ORDER BY created_at DESC LIMIT 1), _to_status, actor, actor_kind, _reason, COALESCE(_metadata, '{}'::jsonb));

  -- Fix: from_status should be prior booking status. Recompute directly:
  UPDATE public.booking_transitions
     SET from_status = (
       SELECT to_status FROM public.booking_transitions bt2
       WHERE bt2.booking_id = _booking_id AND bt2.id <> public.booking_transitions.id
       ORDER BY bt2.created_at DESC LIMIT 1
     )
   WHERE booking_id = _booking_id
     AND id = (SELECT id FROM public.booking_transitions WHERE booking_id = _booking_id ORDER BY created_at DESC LIMIT 1);

  PERFORM public.emit_domain_event(
    'booking.' || _to_status::text,
    'booking',
    _booking_id,
    jsonb_build_object(
      'from', (SELECT from_status FROM public.booking_transitions WHERE booking_id = _booking_id ORDER BY created_at DESC LIMIT 1),
      'to', _to_status,
      'actor_id', actor,
      'actor_kind', actor_kind,
      'reason', _reason,
      'metadata', COALESCE(_metadata, '{}'::jsonb)
    )
  );

  RETURN b;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_booking(uuid, public.booking_status, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_booking(uuid, public.booking_status, text, jsonb) TO authenticated, service_role;

-- Schedule outbox dispatcher every minute
DO $$
BEGIN
  PERFORM cron.unschedule('dispatch-domain-events');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'dispatch-domain-events',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a189ca1-59dc-44ca-8329-9ae70115297f.lovable.app/api/public/hooks/dispatch-events',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppYm1iZ3ZocmV0bnV2Z2l5dG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MzQxMTcsImV4cCI6MjA5ODQxMDExN30.9ddsugSrpePiTJKKCoN2VPhGj7BvPXq6Ylfceajq5jY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
