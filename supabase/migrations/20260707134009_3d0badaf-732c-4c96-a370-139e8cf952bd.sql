
-- =====================================================================
-- Part 1: domain_events (outbox)
-- =====================================================================
CREATE TABLE public.domain_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic           text NOT NULL,
  aggregate_type  text NOT NULL,
  aggregate_id    uuid,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','dispatched','failed','skipped')),
  attempts        integer NOT NULL DEFAULT 0,
  last_error      text,
  available_at    timestamptz NOT NULL DEFAULT now(),
  dispatched_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.domain_events TO service_role;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

-- No authenticated/anon policies: outbox is service_role only.
CREATE POLICY "admins can read domain events"
  ON public.domain_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX domain_events_pending_idx
  ON public.domain_events (available_at, created_at)
  WHERE status = 'pending';

CREATE INDEX domain_events_topic_idx      ON public.domain_events(topic, created_at DESC);
CREATE INDEX domain_events_aggregate_idx  ON public.domain_events(aggregate_type, aggregate_id);

-- Uniform emit helper — triggers + server fns call this
CREATE OR REPLACE FUNCTION public.emit_domain_event(
  _topic          text,
  _aggregate_type text,
  _aggregate_id   uuid,
  _payload        jsonb DEFAULT '{}'::jsonb,
  _available_at   timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.domain_events (topic, aggregate_type, aggregate_id, payload, available_at)
  VALUES (_topic, _aggregate_type, _aggregate_id, COALESCE(_payload, '{}'::jsonb), _available_at)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.emit_domain_event(text, text, uuid, jsonb, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.emit_domain_event(text, text, uuid, jsonb, timestamptz) TO service_role;

-- =====================================================================
-- Part 2: listing_impressions (search log for ranking)
-- =====================================================================
CREATE TABLE public.listing_impressions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text,
  angler_id       uuid,
  service_id      uuid REFERENCES public.bookable_services(id) ON DELETE SET NULL,
  business_id     uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  event_kind      text NOT NULL DEFAULT 'impression'
    CHECK (event_kind IN ('impression','click','inquiry','booking')),
  position        integer,
  query_json      jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_vector  jsonb NOT NULL DEFAULT '{}'::jsonb,
  experiment_key  text,
  variant         text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.listing_impressions TO anon, authenticated;
GRANT SELECT ON public.listing_impressions TO service_role;
GRANT ALL    ON public.listing_impressions TO service_role;
ALTER TABLE public.listing_impressions ENABLE ROW LEVEL SECURITY;

-- Anyone browsing can log an impression (either authenticated or anonymous).
-- angler_id must be null-or-match auth.uid() so a client can't attribute
-- fake events to another user.
CREATE POLICY "anyone can log impressions"
  ON public.listing_impressions FOR INSERT TO anon, authenticated
  WITH CHECK (
    angler_id IS NULL
    OR angler_id = auth.uid()
  );

CREATE POLICY "admins can read impressions"
  ON public.listing_impressions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX listing_impressions_service_time_idx ON public.listing_impressions(service_id, created_at DESC);
CREATE INDEX listing_impressions_kind_time_idx    ON public.listing_impressions(event_kind, created_at DESC);
CREATE INDEX listing_impressions_experiment_idx   ON public.listing_impressions(experiment_key, variant, created_at DESC)
  WHERE experiment_key IS NOT NULL;

-- =====================================================================
-- Part 3: listing_metrics (nightly rollup, public-read for /discover ranking)
-- =====================================================================
CREATE TABLE public.listing_metrics (
  service_id             uuid PRIMARY KEY REFERENCES public.bookable_services(id) ON DELETE CASCADE,
  business_id            uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  avg_rating             numeric(3,2),
  review_count           integer NOT NULL DEFAULT 0,
  response_rate          numeric(4,3),
  response_time_ms       integer,
  acceptance_rate        numeric(4,3),
  cancellation_rate      numeric(4,3),
  no_show_rate           numeric(4,3),
  booking_velocity_30d   integer NOT NULL DEFAULT 0,
  impressions_30d        integer NOT NULL DEFAULT 0,
  bookings_30d           integer NOT NULL DEFAULT 0,
  last_availability_at   timestamptz,
  computed_at            timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.listing_metrics TO anon, authenticated;
GRANT ALL    ON public.listing_metrics TO service_role;
ALTER TABLE public.listing_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing metrics are public"
  ON public.listing_metrics FOR SELECT TO anon, authenticated
  USING (true);

CREATE INDEX listing_metrics_business_idx ON public.listing_metrics(business_id);
CREATE INDEX listing_metrics_rating_idx   ON public.listing_metrics(avg_rating DESC NULLS LAST);
