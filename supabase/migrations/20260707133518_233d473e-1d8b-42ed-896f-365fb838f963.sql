
-- Drop the policy that pins bookings.status to the old enum
DROP POLICY IF EXISTS "Angler writes own review" ON public.reviews;

-- =====================================================================
-- Part 1: Rewrite booking_status enum
-- =====================================================================
ALTER TYPE public.booking_status RENAME TO booking_status_old;

CREATE TYPE public.booking_status AS ENUM (
  'inquiry','pending_payment','pending_confirmation','confirmed','in_progress',
  'completed','reviewed','declined','expired','cancelled_angler','cancelled_captain',
  'no_show','disputed','refunded','weather_cancelled'
);

ALTER TABLE public.bookings
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.booking_status
    USING (
      CASE status::text
        WHEN 'pending_deposit' THEN 'pending_payment'
        WHEN 'cancelled'       THEN 'cancelled_angler'
        ELSE status::text
      END
    )::public.booking_status,
  ALTER COLUMN status SET DEFAULT 'inquiry'::public.booking_status;

DROP TYPE public.booking_status_old;

-- Recreate the review-insert policy against the new enum
-- (verified booking = angler owns it AND has reached a post-trip state)
CREATE POLICY "Angler writes own review"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = angler_id
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = reviews.booking_id
        AND b.angler_id = auth.uid()
        AND b.status IN ('completed'::public.booking_status, 'reviewed'::public.booking_status)
    )
  );

-- =====================================================================
-- Part 2: Extend bookings
-- =====================================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS slot_id                uuid REFERENCES public.service_availability(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instant_book           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_expires_at        timestamptz,
  ADD COLUMN IF NOT EXISTS accept_deadline_at     timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS payout_released_at     timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_charge_id       text,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id     text,
  ADD COLUMN IF NOT EXISTS application_fee_cents  integer,
  ADD COLUMN IF NOT EXISTS stripe_fee_cents       integer,
  ADD COLUMN IF NOT EXISTS refunded_cents         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate        numeric(5,4),
  ADD COLUMN IF NOT EXISTS idempotency_key        text;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_live_unique
  ON public.bookings (slot_id)
  WHERE slot_id IS NOT NULL
    AND status IN ('confirmed','in_progress','completed','reviewed');

CREATE INDEX IF NOT EXISTS bookings_business_status_idx ON public.bookings(business_id, status);
CREATE INDEX IF NOT EXISTS bookings_angler_idx          ON public.bookings(angler_id);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_uniq ON public.bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- =====================================================================
-- Part 3: booking_transitions
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.booking_transitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status  public.booking_status,
  to_status    public.booking_status NOT NULL,
  actor_id     uuid,
  actor_kind   text NOT NULL DEFAULT 'system'
    CHECK (actor_kind IN ('system','angler','business','admin','webhook')),
  reason       text,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_transitions TO authenticated;
GRANT ALL    ON public.booking_transitions TO service_role;
ALTER TABLE public.booking_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business members can read own booking transitions"
  ON public.booking_transitions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_transitions.booking_id
      AND (b.angler_id = auth.uid() OR public.is_business_member(b.business_id, auth.uid(), 'staff'))
  ));
CREATE INDEX booking_transitions_booking_idx ON public.booking_transitions(booking_id, created_at DESC);

-- =====================================================================
-- Part 4: booking_holds
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.booking_holds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id     uuid NOT NULL REFERENCES public.service_availability(id) ON DELETE CASCADE,
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  angler_id   uuid,
  expires_at  timestamptz NOT NULL,
  released_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.booking_holds TO authenticated;
GRANT ALL    ON public.booking_holds TO service_role;
ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or business can read hold"
  ON public.booking_holds FOR SELECT TO authenticated
  USING (
    angler_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_availability sa
      JOIN public.bookable_services bs ON bs.id = sa.service_id
      WHERE sa.id = booking_holds.slot_id
        AND public.is_business_member(bs.business_id, auth.uid(), 'staff')
    )
  );
CREATE UNIQUE INDEX booking_holds_active_slot_uniq
  ON public.booking_holds(slot_id) WHERE released_at IS NULL;

-- =====================================================================
-- Part 5: refunds
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.refunds (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount_cents       integer NOT NULL CHECK (amount_cents > 0),
  reason             text,
  policy_applied     text,
  stripe_refund_id   text UNIQUE,
  reverse_transfer   boolean NOT NULL DEFAULT false,
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','failed')),
  failure_message    text,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  succeeded_at       timestamptz
);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL    ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking parties can read refunds"
  ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = refunds.booking_id
      AND (b.angler_id = auth.uid() OR public.is_business_member(b.business_id, auth.uid(), 'manager'))
  ));
CREATE INDEX refunds_booking_idx ON public.refunds(booking_id);

-- =====================================================================
-- Part 6: disputes
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.disputes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  opened_by         uuid,
  opened_by_kind    text NOT NULL CHECK (opened_by_kind IN ('angler','business','stripe_chargeback','admin')),
  kind              text NOT NULL,
  description       text,
  status            text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','under_review','resolved_captain','resolved_angler','withdrawn')),
  resolution_note   text,
  resolved_by       uuid,
  resolved_at       timestamptz,
  stripe_dispute_id text UNIQUE,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking parties can read disputes"
  ON public.disputes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = disputes.booking_id
      AND (b.angler_id = auth.uid() OR public.is_business_member(b.business_id, auth.uid(), 'manager'))
  ));
CREATE POLICY "booking parties can open disputes"
  ON public.disputes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = disputes.booking_id
      AND (b.angler_id = auth.uid() OR public.is_business_member(b.business_id, auth.uid(), 'manager'))
  ));
CREATE POLICY "admins can update disputes"
  ON public.disputes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER disputes_updated_at BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX disputes_booking_idx ON public.disputes(booking_id);
CREATE INDEX disputes_status_idx  ON public.disputes(status);

-- =====================================================================
-- Part 7: idempotency_keys
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key           text PRIMARY KEY,
  scope         text NOT NULL,
  request_hash  text,
  response      jsonb,
  status        text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress','succeeded','failed')),
  actor_id      uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);
GRANT SELECT ON public.idempotency_keys TO authenticated;
GRANT ALL    ON public.idempotency_keys TO service_role;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "actors can read their own idempotency records"
  ON public.idempotency_keys FOR SELECT TO authenticated
  USING (actor_id = auth.uid());
CREATE INDEX idempotency_keys_scope_idx ON public.idempotency_keys(scope, created_at DESC);

-- =====================================================================
-- Part 8: Stripe Connect on businesses
-- =====================================================================
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_account_id        text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_account_type      text NOT NULL DEFAULT 'express'
    CHECK (stripe_account_type IN ('express','custom','standard')),
  ADD COLUMN IF NOT EXISTS charges_enabled          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payouts_enabled          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS commission_rate          numeric(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS payout_delay_days        integer NOT NULL DEFAULT 2;

-- =====================================================================
-- Part 9: service_availability booked_booking_id
-- =====================================================================
ALTER TABLE public.service_availability
  ADD COLUMN IF NOT EXISTS booked_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_availability_booked_unique
  ON public.service_availability(id) WHERE booked_booking_id IS NOT NULL;

-- =====================================================================
-- Part 10: payouts + payment_events
-- =====================================================================
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS currency         text NOT NULL DEFAULT 'usd',
  ADD COLUMN IF NOT EXISTS arrival_date     date,
  ADD COLUMN IF NOT EXISTS failure_message  text;

ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_events_stripe_event_uniq ON public.payment_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS payment_events_booking_idx ON public.payment_events(booking_id);
