CREATE INDEX IF NOT EXISTS charters_business_created_idx ON public.charters (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookable_services_business_created_idx ON public.bookable_services (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_business_trip_status_idx ON public.bookings (business_id, trip_date, status);