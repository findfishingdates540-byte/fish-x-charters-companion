
-- ============ BOOKINGS ============
DO $$ BEGIN
  CREATE TYPE public.service_kind AS ENUM ('charter_trip','guided_trip','slip_rental','lodging','workshop','rental','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend booking_status enum
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'weather_cancelled';

CREATE TABLE public.bookable_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind public.service_kind NOT NULL,
  title text NOT NULL,
  slug text,
  description text,
  hero_url text,
  duration_minutes int,
  capacity int NOT NULL DEFAULT 1,
  base_price_cents int NOT NULL DEFAULT 0,
  deposit_cents int NOT NULL DEFAULT 0,
  pricing_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  policies_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  includes text[] NOT NULL DEFAULT '{}',
  target_species text[] NOT NULL DEFAULT '{}',
  departure_location text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);
CREATE INDEX idx_services_business ON public.bookable_services(business_id);
GRANT SELECT ON public.bookable_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookable_services TO authenticated;
GRANT ALL ON public.bookable_services TO service_role;
ALTER TABLE public.bookable_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published services are public" ON public.bookable_services FOR SELECT
  USING (is_published = true);
CREATE POLICY "Members view own services" ON public.bookable_services FOR SELECT
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'staff'));
CREATE POLICY "Members create services" ON public.bookable_services FOR INSERT
  TO authenticated WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager'));
CREATE POLICY "Members update services" ON public.bookable_services FOR UPDATE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager'));
CREATE POLICY "Members delete services" ON public.bookable_services FOR DELETE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'));

CREATE TABLE public.service_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.bookable_services(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  seats_available int NOT NULL DEFAULT 1,
  is_blackout boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_avail_service_time ON public.service_availability(service_id, starts_at);
GRANT SELECT ON public.service_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_availability TO authenticated;
GRANT ALL ON public.service_availability TO service_role;
ALTER TABLE public.service_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Availability public where service public" ON public.service_availability FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.bookable_services s WHERE s.id = service_id AND s.is_published));
CREATE POLICY "Members manage availability" ON public.service_availability FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM public.bookable_services s WHERE s.id = service_id AND public.is_business_member(s.business_id, auth.uid(), 'manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookable_services s WHERE s.id = service_id AND public.is_business_member(s.business_id, auth.uid(), 'manager')));

-- Extend existing bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.bookable_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS angler_id uuid,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS escrow_state text NOT NULL DEFAULT 'none' CHECK (escrow_state IN ('none','held','released','refunded')),
  ADD COLUMN IF NOT EXISTS cancellation_policy jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_bookings_business ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_angler ON public.bookings(angler_id);

-- Add angler-side read policy for their own bookings
DROP POLICY IF EXISTS "Angler sees own bookings" ON public.bookings;
CREATE POLICY "Angler sees own bookings" ON public.bookings FOR SELECT
  TO authenticated USING (auth.uid() = angler_id);
DROP POLICY IF EXISTS "Business members see business bookings" ON public.bookings;
CREATE POLICY "Business members see business bookings" ON public.bookings FOR SELECT
  TO authenticated USING (business_id IS NOT NULL AND public.is_business_member(business_id, auth.uid(), 'staff'));
DROP POLICY IF EXISTS "Angler creates booking" ON public.bookings;
CREATE POLICY "Angler creates booking" ON public.bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = angler_id);

CREATE TABLE public.booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text,
  media_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bmsg_booking ON public.booking_messages(booking_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.booking_messages TO authenticated;
GRANT ALL ON public.booking_messages TO service_role;
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Booking participants read" ON public.booking_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (auth.uid() = b.angler_id OR (b.business_id IS NOT NULL AND public.is_business_member(b.business_id, auth.uid(), 'staff'))))
  );
CREATE POLICY "Booking participants send" ON public.booking_messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
      AND (auth.uid() = b.angler_id OR (b.business_id IS NOT NULL AND public.is_business_member(b.business_id, auth.uid(), 'staff'))))
  );

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  angler_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  response_body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_business ON public.reviews(business_id, created_at DESC);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Angler writes own review" ON public.reviews FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = angler_id
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.angler_id = auth.uid() AND b.status = 'completed')
  );
CREATE POLICY "Angler edits own review body" ON public.reviews FOR UPDATE
  TO authenticated USING (auth.uid() = angler_id) WITH CHECK (auth.uid() = angler_id);
CREATE POLICY "Business responds to review" ON public.reviews FOR UPDATE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager'));

-- ============ SPONSORED CHALLENGES ============
CREATE TABLE public.sponsored_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  fishx_challenge_id text,
  title text NOT NULL,
  species text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  prize_value_cents int NOT NULL DEFAULT 0,
  region_json jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_signature','signed','active','completed','cancelled')),
  signed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sponsored_business ON public.sponsored_challenges(business_id);
GRANT SELECT ON public.sponsored_challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsored_challenges TO authenticated;
GRANT ALL ON public.sponsored_challenges TO service_role;
ALTER TABLE public.sponsored_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active sponsored public" ON public.sponsored_challenges FOR SELECT
  USING (status IN ('signed','active','completed'));
CREATE POLICY "Members see own sponsorships" ON public.sponsored_challenges FOR SELECT
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'staff'));
CREATE POLICY "Managers create sponsorship" ON public.sponsored_challenges FOR INSERT
  TO authenticated WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager') AND created_by = auth.uid());
CREATE POLICY "Managers update sponsorship" ON public.sponsored_challenges FOR UPDATE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager'));

-- ============ SUBSCRIPTIONS & PAYMENTS ============
CREATE TABLE public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','premium')),
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_subscriptions TO authenticated;
GRANT ALL ON public.business_subscriptions TO service_role;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers see subscription" ON public.business_subscriptions FOR SELECT
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'));

CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  stripe_payout_id text,
  amount_cents int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payouts_business ON public.payouts(business_id, created_at DESC);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers see payouts" ON public.payouts FOR SELECT
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'));

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
-- service_role only

-- ============ PLATFORM ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON public.audit_logs(actor_id, created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.audit_logs FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- updated_at triggers
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.bookable_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sponsored_updated BEFORE UPDATE ON public.sponsored_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
