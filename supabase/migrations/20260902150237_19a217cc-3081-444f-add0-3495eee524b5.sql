CREATE TABLE public.vendor_shipping_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  flat_rate_cents integer NOT NULL DEFAULT 0,
  per_item_cents integer NOT NULL DEFAULT 0,
  free_over_cents integer,
  policy_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vendor_shipping_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_shipping_settings TO authenticated;
GRANT ALL ON public.vendor_shipping_settings TO service_role;

ALTER TABLE public.vendor_shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipping settings are publicly readable"
  ON public.vendor_shipping_settings FOR SELECT
  USING (true);

CREATE POLICY "Vendors manage their own shipping settings"
  ON public.vendor_shipping_settings FOR ALL
  TO authenticated
  USING (public.is_business_member(business_id, auth.uid(), 'staff'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'));

CREATE TRIGGER update_vendor_shipping_settings_updated_at
  BEFORE UPDATE ON public.vendor_shipping_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();