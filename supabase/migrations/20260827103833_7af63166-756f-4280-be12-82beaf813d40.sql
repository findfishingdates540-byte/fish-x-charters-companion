CREATE TABLE public.product_wishlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.inventory_products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_wishlist TO authenticated;
GRANT ALL ON public.product_wishlist TO service_role;

ALTER TABLE public.product_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own wishlist"
  ON public.product_wishlist FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_product_wishlist_updated_at
  BEFORE UPDATE ON public.product_wishlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_wishlist_user ON public.product_wishlist(user_id, created_at DESC);