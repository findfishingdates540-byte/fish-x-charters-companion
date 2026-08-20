-- 1. Private config store for the scheduler shared secret ---------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS private.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.cron_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.cron_config FROM anon, authenticated;
GRANT ALL ON private.cron_config TO service_role;

CREATE OR REPLACE FUNCTION private.cron_secret()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private
AS $$ SELECT value FROM private.cron_config WHERE key = 'cron_secret' $$;

CREATE OR REPLACE FUNCTION public.set_cron_secret(_value text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = private, public
AS $$
  INSERT INTO private.cron_config (key, value) VALUES ('cron_secret', _value)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
$$;
REVOKE ALL ON FUNCTION public.set_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_cron_secret(text) TO service_role;

-- 2. Business financial columns hidden from anonymous visitors ----------
REVOKE SELECT ON public.businesses FROM anon;
GRANT SELECT (
  id, slug, name, category_key, tagline, description, hero_url, logo_url,
  website, phone, email, address, city, region, country, lat, lng,
  hours_json, amenities_json, is_published, verified_at, premium_until,
  fishx_business_id, created_by, created_at, updated_at
) ON public.businesses TO anon;

-- 3. Follower / like rows no longer publicly enumerable -----------------
DROP POLICY IF EXISTS "Followers are public counts" ON public.business_followers;
CREATE POLICY "Members and self can read followers"
  ON public.business_followers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role));
REVOKE SELECT ON public.business_followers FROM anon;

DROP POLICY IF EXISTS "Likes are public" ON public.post_likes;
CREATE POLICY "Signed-in users read their own likes"
  ON public.post_likes FOR SELECT TO authenticated
  USING (user_id = auth.uid());
REVOKE SELECT ON public.post_likes FROM anon;

-- 4. Role-scoped booking transitions ------------------------------------
CREATE OR REPLACE FUNCTION public.transition_booking(_booking_id uuid, _to_status booking_status, _reason text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF public.has_role(actor, 'admin'::public.app_role) THEN
    authorized := true; actor_kind := 'admin';
  ELSIF b.angler_id = actor THEN
    authorized := true; actor_kind := 'angler';
  ELSIF b.business_id IS NOT NULL AND public.is_business_member(b.business_id, actor, 'staff'::public.business_member_role) THEN
    authorized := true; actor_kind := 'captain';
  END IF;

  IF NOT authorized THEN
    RAISE EXCEPTION 'Not authorized to transition this booking' USING ERRCODE = '42501';
  END IF;

  -- Each side may only set the outcomes that belong to their role, so neither
  -- party can shift blame for a cancellation or no-show onto the other.
  IF actor_kind = 'angler'
     AND _to_status NOT IN ('cancelled_angler','disputed','completed','reviewed') THEN
    RAISE EXCEPTION 'Guests cannot set status %', _to_status USING ERRCODE = '42501';
  ELSIF actor_kind = 'captain'
     AND _to_status NOT IN ('confirmed','declined','in_progress','completed','cancelled_captain','weather_cancelled','no_show','disputed') THEN
    RAISE EXCEPTION 'Operators cannot set status %', _to_status USING ERRCODE = '42501';
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
  VALUES (_booking_id, (SELECT status FROM public.bookings WHERE id = _booking_id), _to_status, actor, actor_kind, _reason, COALESCE(_metadata, '{}'::jsonb));

  PERFORM public.emit_domain_event(
    'booking.' || _to_status::text,
    'booking',
    _booking_id,
    jsonb_build_object(
      'to', _to_status,
      'actor_id', actor,
      'actor_kind', actor_kind,
      'reason', _reason,
      'metadata', COALESCE(_metadata, '{}'::jsonb)
    )
  );

  RETURN b;
END;
$function$;

-- 5. Cron jobs authenticate with the private scheduler secret -----------
SELECT cron.unschedule('release-escrow-payouts');
SELECT cron.unschedule('release-escrow');
SELECT cron.unschedule('booking-lifecycle-timers');
SELECT cron.unschedule('dispatch-domain-events');

SELECT cron.schedule('dispatch-domain-events', '* * * * *', $cron$
  SELECT net.http_post(
    url := 'https://project--4a189ca1-59dc-44ca-8329-9ae70115297f.lovable.app/api/public/hooks/dispatch-events',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', private.cron_secret()),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('release-escrow', '*/15 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://project--4a189ca1-59dc-44ca-8329-9ae70115297f.lovable.app/api/public/hooks/release-escrow',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', private.cron_secret()),
    body := '{}'::jsonb
  );
$cron$);

SELECT cron.schedule('booking-lifecycle-timers', '*/5 * * * *', $cron$
  SELECT net.http_post(
    url := 'https://project--4a189ca1-59dc-44ca-8329-9ae70115297f.lovable.app/api/public/hooks/booking-timers',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', private.cron_secret()),
    body := '{}'::jsonb
  );
$cron$);