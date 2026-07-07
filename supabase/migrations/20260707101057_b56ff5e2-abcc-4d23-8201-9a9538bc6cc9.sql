
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  boat_id uuid REFERENCES public.boats(id) ON DELETE SET NULL,
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  guest_phone text,
  party_size int,
  preferred_date date,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inquiries TO authenticated;
GRANT INSERT ON public.inquiries TO anon;
GRANT ALL ON public.inquiries TO service_role;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone (including guests) can submit an inquiry
CREATE POLICY "Anyone can create inquiries"
  ON public.inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Business members can read inquiries for their business
CREATE POLICY "Business members read inquiries"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'));

-- The submitter can read their own inquiry
CREATE POLICY "Submitter reads own inquiry"
  ON public.inquiries FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid());

-- Business managers can update status
CREATE POLICY "Business managers update inquiries"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'manager'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager'));

CREATE INDEX idx_inquiries_business ON public.inquiries(business_id, created_at DESC);
CREATE INDEX idx_inquiries_status ON public.inquiries(status);

CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
