
-- 1. RLS-enabled tables with no policies: add admin-only read; writes remain service-role only
CREATE POLICY "Admins can read webhook events"
  ON public.fishx_webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can read payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Replace overly-permissive inquiries INSERT policy with shape-validated version
DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.inquiries;
CREATE POLICY "Guests and users can create inquiries"
  ON public.inquiries FOR INSERT TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = inquiries.business_id AND b.is_published = true)
    AND message IS NOT NULL
    AND length(btrim(message)) BETWEEN 5 AND 2000
    AND (party_size IS NULL OR party_size BETWEEN 1 AND 50)
  );

-- 3. Lock down SECURITY DEFINER functions that don't need public execute rights
REVOKE EXECUTE ON FUNCTION public.emit_domain_event(text, text, uuid, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emit_domain_event(text, text, uuid, jsonb, timestamptz) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transition_booking(uuid, public.booking_status, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_booking(uuid, public.booking_status, text, jsonb) TO authenticated, service_role;

-- Note: has_role and is_business_member intentionally remain EXECUTE-able by anon/authenticated
-- because they are referenced inside RLS policies; the querying role must be able to invoke them.
