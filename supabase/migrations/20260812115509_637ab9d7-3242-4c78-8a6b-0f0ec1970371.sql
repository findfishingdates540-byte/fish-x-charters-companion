-- ---------------------------------------------------------------
-- Lock down internal helpers created in the previous migration
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.expire_stale_holds(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_slot_seats_on_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_status_releases_seats(public.booking_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stale_holds(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_slot(uuid, integer, text, text, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_slot(uuid, integer, text, text, integer) FROM anon;

-- ---------------------------------------------------------------
-- Phase 2: lifecycle timers
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_decline_expired_requests(_limit integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.bookings
     WHERE status = 'pending_confirmation'
       AND accept_deadline_at IS NOT NULL
       AND accept_deadline_at < now()
     ORDER BY accept_deadline_at
     LIMIT GREATEST(COALESCE(_limit, 200), 1)
  LOOP
    UPDATE public.bookings SET status = 'declined', updated_at = now()
     WHERE id = r.id AND status = 'pending_confirmation';
    INSERT INTO public.booking_transitions (booking_id, from_status, to_status, actor_kind, reason)
    VALUES (r.id, 'pending_confirmation', 'declined', 'system', 'accept_timeout');
    PERFORM public.emit_domain_event('booking.declined', 'booking', r.id,
      jsonb_build_object('booking_id', r.id, 'reason', 'accept_timeout'));
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_trip_lifecycle(_grace_hours integer DEFAULT 24, _limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record; started integer := 0; finished integer := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.bookings
     WHERE status = 'confirmed' AND trip_date <= (now() AT TIME ZONE 'UTC')::date
     ORDER BY trip_date LIMIT GREATEST(COALESCE(_limit, 200), 1)
  LOOP
    UPDATE public.bookings SET status = 'in_progress', updated_at = now()
     WHERE id = r.id AND status = 'confirmed';
    INSERT INTO public.booking_transitions (booking_id, from_status, to_status, actor_kind, reason)
    VALUES (r.id, 'confirmed', 'in_progress', 'system', 'trip_date_reached');
    PERFORM public.emit_domain_event('booking.in_progress', 'booking', r.id,
      jsonb_build_object('booking_id', r.id));
    started := started + 1;
  END LOOP;

  FOR r IN
    SELECT id FROM public.bookings
     WHERE status = 'in_progress'
       AND trip_date < ((now() - make_interval(hours => GREATEST(COALESCE(_grace_hours, 24), 1))) AT TIME ZONE 'UTC')::date
     ORDER BY trip_date LIMIT GREATEST(COALESCE(_limit, 200), 1)
  LOOP
    UPDATE public.bookings SET status = 'completed', updated_at = now()
     WHERE id = r.id AND status = 'in_progress';
    INSERT INTO public.booking_transitions (booking_id, from_status, to_status, actor_kind, reason)
    VALUES (r.id, 'in_progress', 'completed', 'system', 'trip_end_grace');
    PERFORM public.emit_domain_event('booking.completed', 'booking', r.id,
      jsonb_build_object('booking_id', r.id));
    finished := finished + 1;
  END LOOP;

  RETURN jsonb_build_object('started', started, 'completed', finished);
END;
$$;

REVOKE ALL ON FUNCTION public.auto_decline_expired_requests(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.advance_trip_lifecycle(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_decline_expired_requests(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_trip_lifecycle(integer, integer) TO service_role;

-- ---------------------------------------------------------------
-- Phase 3: notifications
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  severity text NOT NULL DEFAULT 'info',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON public.notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  email_enabled boolean NOT NULL DEFAULT true,
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs" ON public.notification_preferences
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_notification_prefs_updated
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Delivery ledger: guarantees one send per (event, recipient, channel)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  dedupe_key text NOT NULL,
  user_id uuid NOT NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dedupe_key, user_id, channel)
);

GRANT ALL ON public.notification_deliveries TO service_role;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read delivery log" ON public.notification_deliveries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;