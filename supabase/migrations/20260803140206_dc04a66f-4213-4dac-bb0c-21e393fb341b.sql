ALTER TABLE public.product_orders
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS payout_cents integer,
  ADD COLUMN IF NOT EXISTS application_fee_cents integer,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_released_at timestamptz;

CREATE INDEX IF NOT EXISTS product_orders_session_idx ON public.product_orders (stripe_session_id);

DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.product_orders;
CREATE POLICY "Buyers can view their own orders"
  ON public.product_orders FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Buyers can view their own order items" ON public.product_order_items;
CREATE POLICY "Buyers can view their own order items"
  ON public.product_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_orders o WHERE o.id = order_id AND o.buyer_id = auth.uid()));