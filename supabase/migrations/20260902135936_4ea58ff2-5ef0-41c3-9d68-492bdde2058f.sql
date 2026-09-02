DROP POLICY IF EXISTS "Participants touch conversation" ON public.business_conversations;
CREATE POLICY "Participants touch conversation" ON public.business_conversations FOR UPDATE
  TO authenticated USING (
    auth.uid() = angler_id OR public.is_business_member(business_id, auth.uid(), 'staff')
  ) WITH CHECK (
    auth.uid() = angler_id OR public.is_business_member(business_id, auth.uid(), 'staff')
  );

CREATE INDEX IF NOT EXISTS idx_convo_angler
  ON public.business_conversations(angler_id, last_message_at DESC);