
-- ============ MARINA ============
CREATE TABLE public.marina_slips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  slip_number TEXT NOT NULL,
  length_ft NUMERIC(6,2),
  beam_ft NUMERIC(6,2),
  draft_ft NUMERIC(6,2),
  amperage TEXT,
  monthly_rate_cents INTEGER,
  nightly_rate_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, slip_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marina_slips TO authenticated;
GRANT ALL ON public.marina_slips TO service_role;
ALTER TABLE public.marina_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage marina slips" ON public.marina_slips
  FOR ALL TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role));
CREATE TRIGGER trg_marina_slips_updated BEFORE UPDATE ON public.marina_slips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ix_marina_slips_business ON public.marina_slips(business_id);

CREATE TABLE public.marina_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  slip_id UUID REFERENCES public.marina_slips(id) ON DELETE SET NULL,
  vessel_name TEXT NOT NULL,
  vessel_length_ft NUMERIC(6,2),
  captain_name TEXT,
  arrive_date DATE NOT NULL,
  depart_date DATE NOT NULL,
  nightly_rate_cents INTEGER,
  total_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marina_reservations TO authenticated;
GRANT ALL ON public.marina_reservations TO service_role;
ALTER TABLE public.marina_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage marina reservations" ON public.marina_reservations
  FOR ALL TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role));
CREATE TRIGGER trg_marina_reservations_updated BEFORE UPDATE ON public.marina_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ix_marina_reservations_business ON public.marina_reservations(business_id);
CREATE INDEX ix_marina_reservations_slip ON public.marina_reservations(slip_id);

-- ============ INVENTORY (tackle / gear / apparel) ============
CREATE TABLE public.inventory_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sku TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  compare_at_cents INTEGER,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_products TO authenticated;
GRANT SELECT ON public.inventory_products TO anon;
GRANT ALL ON public.inventory_products TO service_role;
ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view published products" ON public.inventory_products
  FOR SELECT USING (is_published = true);
CREATE POLICY "Members manage inventory" ON public.inventory_products
  FOR ALL TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role));
CREATE TRIGGER trg_inventory_products_updated BEFORE UPDATE ON public.inventory_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ix_inventory_products_business ON public.inventory_products(business_id);
CREATE INDEX ix_inventory_products_published ON public.inventory_products(is_published) WHERE is_published = true;

-- ============ ORDERS ============
CREATE TABLE public.product_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email TEXT,
  buyer_name TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  shipping_address JSONB,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_orders TO authenticated;
GRANT ALL ON public.product_orders TO service_role;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view/manage orders" ON public.product_orders
  FOR ALL TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role));
CREATE POLICY "Buyers view own orders" ON public.product_orders
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());
CREATE TRIGGER trg_product_orders_updated BEFORE UPDATE ON public.product_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ix_product_orders_business ON public.product_orders(business_id);
CREATE INDEX ix_product_orders_buyer ON public.product_orders(buyer_id);

CREATE TABLE public.product_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.product_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.inventory_products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  sku TEXT,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_order_items TO authenticated;
GRANT ALL ON public.product_order_items TO service_role;
ALTER TABLE public.product_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view/manage order items" ON public.product_order_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_orders po
    WHERE po.id = order_id
      AND public.is_business_member(po.business_id, auth.uid(), 'staff'::public.business_member_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_orders po
    WHERE po.id = order_id
      AND public.is_business_member(po.business_id, auth.uid(), 'staff'::public.business_member_role)
  ));
CREATE POLICY "Buyers view own order items" ON public.product_order_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_orders po
    WHERE po.id = order_id AND po.buyer_id = auth.uid()
  ));
CREATE INDEX ix_product_order_items_order ON public.product_order_items(order_id);

-- ============ GUIDE AVAILABILITY ============
CREATE TABLE public.guide_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.bookable_services(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_availability TO authenticated;
GRANT SELECT ON public.guide_availability TO anon;
GRANT ALL ON public.guide_availability TO service_role;
ALTER TABLE public.guide_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view open guide slots" ON public.guide_availability
  FOR SELECT USING (status = 'open');
CREATE POLICY "Members manage guide availability" ON public.guide_availability
  FOR ALL TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'::public.business_member_role));
CREATE TRIGGER trg_guide_availability_updated BEFORE UPDATE ON public.guide_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX ix_guide_availability_business_date ON public.guide_availability(business_id, slot_date);
