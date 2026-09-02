-- ---------- Marina: bookable slips ----------
ALTER TABLE public.marina_slips
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.bookable_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT false;

-- ---------- Marina: service requests ----------
CREATE TABLE public.marina_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requester_id uuid,
  slip_id uuid REFERENCES public.marina_slips(id) ON DELETE SET NULL,
  service_key text NOT NULL,
  vessel_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  requested_date date,
  note text,
  status text NOT NULL DEFAULT 'new',
  staff_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.marina_service_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marina_service_requests TO authenticated;
GRANT ALL ON public.marina_service_requests TO service_role;

ALTER TABLE public.marina_service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marina staff read their service requests"
  ON public.marina_service_requests FOR SELECT
  TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid(), 'staff')
    OR requester_id = auth.uid()
  );

CREATE POLICY "Anyone can submit a service request"
  ON public.marina_service_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_published)
    AND (requester_id IS NULL OR requester_id = auth.uid())
  );

CREATE POLICY "Marina staff update their service requests"
  ON public.marina_service_requests FOR UPDATE
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'));

CREATE POLICY "Marina staff delete their service requests"
  ON public.marina_service_requests FOR DELETE
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'manager'));

CREATE TRIGGER update_marina_service_requests_updated_at
  BEFORE UPDATE ON public.marina_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_marina_service_requests_business ON public.marina_service_requests(business_id, status, created_at DESC);

-- ---------- Product variants ----------
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  option_name text NOT NULL DEFAULT 'Option',
  option_value text NOT NULL,
  sku text,
  price_delta_cents integer NOT NULL DEFAULT 0,
  stock_qty integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants of published products are public"
  ON public.product_variants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_products p
      WHERE p.id = product_id AND p.is_published
    )
    OR public.is_business_member(business_id, auth.uid(), 'staff')
  );

CREATE POLICY "Shop staff manage their variants"
  ON public.product_variants FOR ALL
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'));

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);

ALTER TABLE public.product_order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_label text;

-- ---------- Wholesale settings & price breaks ----------
CREATE TABLE public.trade_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  company_name text NOT NULL,
  tax_id text,
  contact_email text,
  contact_phone text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  decided_at timestamp with time zone,
  decided_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (business_id, buyer_id)
);

GRANT SELECT, INSERT, UPDATE ON public.trade_accounts TO authenticated;
GRANT ALL ON public.trade_accounts TO service_role;

ALTER TABLE public.trade_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and brand staff read trade accounts"
  ON public.trade_accounts FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid() OR public.is_business_member(business_id, auth.uid(), 'staff'));

CREATE POLICY "Buyers apply for a trade account"
  ON public.trade_accounts FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid() AND status = 'pending');

CREATE POLICY "Brand staff decide trade accounts"
  ON public.trade_accounts FOR UPDATE
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'));

CREATE TRIGGER update_trade_accounts_updated_at
  BEFORE UPDATE ON public.trade_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trade_accounts_business ON public.trade_accounts(business_id, status);

CREATE TABLE public.product_wholesale_settings (
  product_id uuid PRIMARY KEY REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  min_order_qty integer NOT NULL DEFAULT 1,
  case_pack integer NOT NULL DEFAULT 1,
  wholesale_only boolean NOT NULL DEFAULT false,
  wholesale_price_cents integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Trade pricing is never exposed to signed-out visitors.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_wholesale_settings TO authenticated;
GRANT ALL ON public.product_wholesale_settings TO service_role;

ALTER TABLE public.product_wholesale_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved trade buyers and staff read wholesale settings"
  ON public.product_wholesale_settings FOR SELECT
  TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid(), 'staff')
    OR EXISTS (
      SELECT 1 FROM public.trade_accounts t
      WHERE t.business_id = product_wholesale_settings.business_id
        AND t.buyer_id = auth.uid()
        AND t.status = 'approved'
    )
  );

CREATE POLICY "Shop staff manage wholesale settings"
  ON public.product_wholesale_settings FOR ALL
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'));

CREATE TRIGGER update_product_wholesale_settings_updated_at
  BEFORE UPDATE ON public.product_wholesale_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  min_qty integer NOT NULL,
  unit_price_cents integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (product_id, min_qty)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_price_tiers TO authenticated;
GRANT ALL ON public.product_price_tiers TO service_role;

ALTER TABLE public.product_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved trade buyers and staff read price tiers"
  ON public.product_price_tiers FOR SELECT
  TO authenticated
  USING (
    public.is_business_member(business_id, auth.uid(), 'staff')
    OR EXISTS (
      SELECT 1 FROM public.trade_accounts t
      WHERE t.business_id = product_price_tiers.business_id
        AND t.buyer_id = auth.uid()
        AND t.status = 'approved'
    )
  );

CREATE POLICY "Shop staff manage price tiers"
  ON public.product_price_tiers FOR ALL
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'));

CREATE INDEX idx_product_price_tiers_product ON public.product_price_tiers(product_id, min_qty);