-- =====================================================================
-- withdraw_dispute: let the angler who opened a case withdraw it.
-- The disputes UPDATE policy is admin-only by design, so the withdraw
-- path runs through this SECURITY DEFINER function. It only ever flips
-- an open/under_review case that the caller opened to 'withdrawn'; the
-- caller must separately release the booking via transition_booking.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.withdraw_dispute(_dispute_id uuid)
RETURNS public.disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.disputes;
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO d FROM public.disputes WHERE id = _dispute_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found' USING ERRCODE = 'P0002';
  END IF;

  IF d.opened_by IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'Only the case opener can withdraw it' USING ERRCODE = '42501';
  END IF;

  IF d.status NOT IN ('open', 'under_review') THEN
    RAISE EXCEPTION 'Case is not open' USING ERRCODE = '22023';
  END IF;

  UPDATE public.disputes
     SET status          = 'withdrawn',
         resolution_note  = 'Withdrawn by angler',
         resolved_by      = actor,
         resolved_at      = now()
   WHERE id = _dispute_id
   RETURNING * INTO d;

  RETURN d;
END;
$$;

GRANT EXECUTE ON FUNCTION public.withdraw_dispute(uuid) TO authenticated;
