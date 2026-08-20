INSERT INTO public.service_availability (service_id, starts_at, ends_at, seats_available, seats_booked, is_blackout, price_cents, notes)
SELECT s.id,
       d.day + time '07:00',
       (d.day + time '07:00') + make_interval(mins => COALESCE(s.duration_minutes, 480)),
       GREATEST(COALESCE(s.capacity, 4), 1),
       0,
       false,
       s.base_price_cents,
       'Auto-released schedule — edit any day from your availability calendar.'
FROM public.bookable_services s
CROSS JOIN LATERAL generate_series(
  (now() AT TIME ZONE 'utc')::date + 1,
  (now() AT TIME ZONE 'utc')::date + 90,
  interval '1 day'
) AS d(day)
WHERE s.is_published
  AND s.kind <> 'other'
  AND NOT EXISTS (
    SELECT 1 FROM public.service_availability a
    WHERE a.service_id = s.id AND a.starts_at > now()
  );