ALTER TABLE public.businesses ALTER COLUMN commission_rate SET DEFAULT 0.20;
UPDATE public.businesses SET commission_rate = 0.20 WHERE commission_rate IS DISTINCT FROM 0.20;
ALTER TABLE public.bookings ALTER COLUMN commission_rate SET DEFAULT 0.20;

CREATE OR REPLACE FUNCTION public.set_escrow_hold_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());
    NEW.dispute_window_ends_at := COALESCE(NEW.completed_at, now()) + interval '24 hours';
    IF NEW.escrow_state = 'none' THEN
      NEW.escrow_state := 'held';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_escrow_window ON public.bookings;
CREATE TRIGGER trg_bookings_escrow_window
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.set_escrow_hold_window();

CREATE OR REPLACE FUNCTION public.freeze_escrow_on_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('open','investigating') THEN
    UPDATE public.bookings
       SET escrow_state = 'frozen'
     WHERE id = NEW.booking_id
       AND escrow_state IN ('none','held');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_disputes_freeze_escrow ON public.disputes;
CREATE TRIGGER trg_disputes_freeze_escrow
AFTER INSERT OR UPDATE OF status ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.freeze_escrow_on_dispute();