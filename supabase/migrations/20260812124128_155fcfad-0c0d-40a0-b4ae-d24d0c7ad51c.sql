-- 1. Recompute listing metrics -------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_listing_metrics()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer := 0;
BEGIN
  INSERT INTO public.listing_metrics AS lm (
    service_id, business_id, avg_rating, review_count,
    acceptance_rate, cancellation_rate, no_show_rate,
    booking_velocity_30d, impressions_30d, bookings_30d,
    last_availability_at, computed_at
  )
  SELECT
    s.id,
    s.business_id,
    rv.avg_rating,
    COALESCE(rv.review_count, 0),
    bk.acceptance_rate,
    bk.cancellation_rate,
    bk.no_show_rate,
    COALESCE(bk.bookings_30d, 0),
    COALESCE(im.impressions_30d, 0),
    COALESCE(bk.bookings_30d, 0),
    av.last_availability_at,
    now()
  FROM public.bookable_services s
  LEFT JOIN LATERAL (
    SELECT AVG(r.rating)::numeric AS avg_rating, COUNT(*)::int AS review_count
    FROM public.reviews r
    JOIN public.bookings b ON b.id = r.booking_id
    WHERE b.service_id = s.id
  ) rv ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE b.created_at > now() - interval '30 days')::int AS bookings_30d,
      NULLIF(
        COUNT(*) FILTER (WHERE b.status IN ('confirmed','in_progress','completed','reviewed'))::numeric
        / NULLIF(COUNT(*) FILTER (WHERE b.status IN ('confirmed','in_progress','completed','reviewed','declined','expired')), 0),
      NULL) AS acceptance_rate,
      NULLIF(
        COUNT(*) FILTER (WHERE b.status IN ('cancelled_captain'))::numeric
        / NULLIF(COUNT(*), 0),
      NULL) AS cancellation_rate,
      NULLIF(
        COUNT(*) FILTER (WHERE b.status = 'no_show')::numeric
        / NULLIF(COUNT(*), 0),
      NULL) AS no_show_rate
    FROM public.bookings b
    WHERE b.service_id = s.id
  ) bk ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE i.created_at > now() - interval '30 days')::int AS impressions_30d
    FROM public.listing_impressions i
    WHERE i.service_id = s.id
  ) im ON TRUE
  LEFT JOIN LATERAL (
    SELECT MAX(a.created_at) AS last_availability_at
    FROM public.service_availability a
    WHERE a.service_id = s.id
  ) av ON TRUE
  ON CONFLICT (service_id) DO UPDATE SET
    business_id = EXCLUDED.business_id,
    avg_rating = EXCLUDED.avg_rating,
    review_count = EXCLUDED.review_count,
    acceptance_rate = EXCLUDED.acceptance_rate,
    cancellation_rate = EXCLUDED.cancellation_rate,
    no_show_rate = EXCLUDED.no_show_rate,
    booking_velocity_30d = EXCLUDED.booking_velocity_30d,
    impressions_30d = EXCLUDED.impressions_30d,
    bookings_30d = EXCLUDED.bookings_30d,
    last_availability_at = EXCLUDED.last_availability_at,
    computed_at = now();

  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

-- 2. Weighted-sum ranking -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rank_listings(
  _city text DEFAULT NULL,
  _kinds text[] DEFAULT NULL,
  _limit integer DEFAULT 24
)
RETURNS TABLE (
  service_id uuid,
  business_id uuid,
  score numeric,
  features jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      s.id,
      s.business_id,
      s.created_at,
      b.city,
      b.verified_at,
      b.payouts_enabled,
      COALESCE(lm.avg_rating, 0) / 5.0                                   AS f_quality,
      LEAST(COALESCE(lm.review_count, 0), 25)::numeric / 25.0            AS f_reviews,
      COALESCE(lm.acceptance_rate, 0.7)
        * (1 - COALESCE(lm.cancellation_rate, 0))
        * (1 - COALESCE(lm.no_show_rate, 0))                             AS f_reliability,
      CASE WHEN COALESCE(lm.impressions_30d, 0) > 0
        THEN LEAST(lm.bookings_30d::numeric / lm.impressions_30d, 0.3) / 0.3
        ELSE 0 END                                                       AS f_conversion,
      CASE WHEN lm.last_availability_at IS NOT NULL
        THEN exp(-EXTRACT(epoch FROM (now() - lm.last_availability_at)) / (30 * 86400))
        ELSE 0 END                                                       AS f_freshness,
      GREATEST(0, 1 - EXTRACT(epoch FROM (now() - s.created_at)) / (30 * 86400)) AS f_coldstart
    FROM public.bookable_services s
    JOIN public.businesses b ON b.id = s.business_id
    LEFT JOIN public.listing_metrics lm ON lm.service_id = s.id
    WHERE s.is_published = TRUE
      AND b.is_published = TRUE
      AND (_kinds IS NULL OR s.kind::text = ANY(_kinds))
  )
  SELECT
    base.id,
    base.business_id,
    ROUND((
        0.28 * f_quality
      + 0.10 * f_reviews
      + 0.18 * f_reliability
      + 0.14 * f_conversion
      + 0.10 * f_freshness
      + 0.08 * f_coldstart
      + 0.07 * (CASE WHEN base.verified_at IS NOT NULL THEN 1 ELSE 0 END)
      + 0.05 * (CASE WHEN _city IS NOT NULL AND base.city = _city THEN 1 ELSE 0 END)
    )::numeric, 5) AS score,
    jsonb_build_object(
      'quality', ROUND(f_quality, 4),
      'reviews', ROUND(f_reviews, 4),
      'reliability', ROUND(f_reliability, 4),
      'conversion', ROUND(f_conversion, 4),
      'freshness', ROUND(f_freshness, 4),
      'coldstart', ROUND(f_coldstart, 4),
      'verified', (base.verified_at IS NOT NULL),
      'city_match', (_city IS NOT NULL AND base.city = _city)
    ) AS features
  FROM base
  ORDER BY score DESC, base.created_at DESC
  LIMIT GREATEST(COALESCE(_limit, 24), 1);
$$;

-- 3. Impression / click logging --------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_listing_event(
  _service_id uuid,
  _event_kind text,
  _position integer DEFAULT NULL,
  _query jsonb DEFAULT '{}'::jsonb,
  _features jsonb DEFAULT '{}'::jsonb,
  _session_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _event_kind NOT IN ('impression', 'click', 'book') THEN
    RAISE EXCEPTION 'invalid event kind %', _event_kind;
  END IF;

  INSERT INTO public.listing_impressions (
    session_id, angler_id, service_id, business_id, event_kind, position, query_json, feature_vector
  )
  SELECT _session_id, auth.uid(), s.id, s.business_id, _event_kind, _position, COALESCE(_query, '{}'::jsonb), COALESCE(_features, '{}'::jsonb)
  FROM public.bookable_services s
  WHERE s.id = _service_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_listing_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recompute_listing_metrics() TO service_role;
GRANT EXECUTE ON FUNCTION public.rank_listings(text, text[], integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_listing_event(uuid, text, integer, jsonb, jsonb, text) TO anon, authenticated, service_role;

-- 4. Nightly recompute ------------------------------------------------------------
SELECT cron.unschedule('recompute-listing-metrics')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recompute-listing-metrics');

SELECT cron.schedule(
  'recompute-listing-metrics',
  '0 3 * * *',
  $cron$ SELECT public.recompute_listing_metrics(); $cron$
);

SELECT public.recompute_listing_metrics();
