-- 1) Seats can never drop below what is already booked; blackout/delete guarded too.
CREATE OR REPLACE FUNCTION public.guard_availability_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  conflict_count integer;
  svc_capacity integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.seats_booked, 0) > 0 THEN
      RAISE EXCEPTION 'This date already has % booked seat(s) — block or reduce it instead of deleting.', OLD.seats_booked
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.seats_available < COALESCE(NEW.seats_booked, 0) THEN
    RAISE EXCEPTION 'Cannot set % seat(s): % are already booked on this date.', NEW.seats_available, NEW.seats_booked
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_blackout AND NOT COALESCE(OLD.is_blackout, false)
     AND COALESCE(NEW.seats_booked, 0) > 0 THEN
    RAISE EXCEPTION 'Cannot block a date with % booked seat(s) — cancel those bookings first.', NEW.seats_booked
      USING ERRCODE = '23514';
  END IF;

  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'Slot end time must be after its start time.' USING ERRCODE = '22023';
  END IF;

  -- Overlapping slots on the same listing would let the same crew/boat be
  -- double-sold, so block them unless the other slot is empty and blacked out.
  SELECT count(*) INTO conflict_count
  FROM public.service_availability a
  WHERE a.service_id = NEW.service_id
    AND a.id <> NEW.id
    AND NOT (a.is_blackout AND COALESCE(a.seats_booked, 0) = 0)
    AND NOT NEW.is_blackout
    AND a.starts_at < NEW.ends_at
    AND a.ends_at > NEW.starts_at;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'This time overlaps an existing departure for this listing.' USING ERRCODE = '23505';
  END IF;

  SELECT capacity INTO svc_capacity FROM public.bookable_services WHERE id = NEW.service_id;
  IF svc_capacity IS NOT NULL AND NEW.seats_available > svc_capacity THEN
    RAISE EXCEPTION 'Seats (%) exceed the listing capacity of %.', NEW.seats_available, svc_capacity
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_availability_conflicts ON public.service_availability;
CREATE TRIGGER trg_availability_conflicts
BEFORE INSERT OR UPDATE OR DELETE ON public.service_availability
FOR EACH ROW EXECUTE FUNCTION public.guard_availability_conflicts();

-- 2) Listing capacity can never fall below booked seats on any of its dates.
CREATE OR REPLACE FUNCTION public.guard_service_capacity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  max_booked integer;
BEGIN
  IF NEW.capacity IS DISTINCT FROM OLD.capacity THEN
    SELECT COALESCE(MAX(seats_booked), 0) INTO max_booked
    FROM public.service_availability
    WHERE service_id = NEW.id;

    IF NEW.capacity < max_booked THEN
      RAISE EXCEPTION 'Capacity cannot be lower than % — that many seats are already booked on one of your dates.', max_booked
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_capacity_guard ON public.bookable_services;
CREATE TRIGGER trg_service_capacity_guard
BEFORE UPDATE ON public.bookable_services
FOR EACH ROW EXECUTE FUNCTION public.guard_service_capacity();