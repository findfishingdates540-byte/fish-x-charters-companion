
-- Update handle_new_user to read intended_role and revoke public execute
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  intended text;
  role_val public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, avatar_url, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  intended := COALESCE(NEW.raw_user_meta_data ->> 'intended_role', 'angler');
  IF intended NOT IN ('angler','business_owner','captain') THEN
    intended := 'angler';
  END IF;
  role_val := intended::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, role_val)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- business_member_role enum
DO $$ BEGIN
  CREATE TYPE public.business_member_role AS ENUM ('owner','manager','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- business_categories
CREATE TABLE public.business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT ALL ON public.business_categories TO service_role;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.business_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.business_categories FOR ALL
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.business_categories (key,label,icon,sort_order) VALUES
  ('charter','Charter Captain','anchor',10),
  ('guide_service','Guide Service','compass',20),
  ('tackle_shop','Tackle Shop','shopping-bag',30),
  ('bait_shop','Bait Shop','fish',40),
  ('marina','Marina','ship',50),
  ('lodge','Lodge','home',60),
  ('apparel','Apparel Brand','shirt',70),
  ('gear_mfg','Gear Manufacturer','wrench',80);

-- businesses
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category_key text NOT NULL REFERENCES public.business_categories(key),
  tagline text,
  description text,
  hero_url text,
  logo_url text,
  website text,
  phone text,
  email text,
  address text,
  city text,
  region text,
  country text,
  lat double precision,
  lng double precision,
  hours_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  amenities_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  premium_until timestamptz,
  fishx_business_id text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_category ON public.businesses(category_key);
CREATE INDEX idx_businesses_published ON public.businesses(is_published) WHERE is_published;
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- business_members
CREATE TABLE public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.business_member_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX idx_biz_members_user ON public.business_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
GRANT ALL ON public.business_members TO service_role;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Security-definer membership helper
CREATE OR REPLACE FUNCTION public.is_business_member(_business_id uuid, _user_id uuid, _min_role public.business_member_role DEFAULT 'staff')
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = _business_id
      AND user_id = _user_id
      AND CASE _min_role
        WHEN 'staff'::public.business_member_role THEN true
        WHEN 'manager'::public.business_member_role THEN role IN ('owner','manager')
        WHEN 'owner'::public.business_member_role THEN role = 'owner'
      END
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid,uuid,public.business_member_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid,uuid,public.business_member_role) TO authenticated, anon;

-- Businesses policies
CREATE POLICY "Published businesses are public" ON public.businesses FOR SELECT
  USING (is_published = true);
CREATE POLICY "Members can view their businesses" ON public.businesses FOR SELECT
  TO authenticated USING (public.is_business_member(id, auth.uid(), 'staff'));
CREATE POLICY "Business owners can create" ON public.businesses FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = created_by
    AND (public.has_role(auth.uid(),'business_owner') OR public.has_role(auth.uid(),'captain'))
  );
CREATE POLICY "Managers can update business" ON public.businesses FOR UPDATE
  TO authenticated USING (public.is_business_member(id, auth.uid(), 'manager'))
  WITH CHECK (public.is_business_member(id, auth.uid(), 'manager'));
CREATE POLICY "Owners can delete business" ON public.businesses FOR DELETE
  TO authenticated USING (public.is_business_member(id, auth.uid(), 'owner'));

-- Business members policies
CREATE POLICY "Members can view roster" ON public.business_members FOR SELECT
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'staff'));
CREATE POLICY "Managers can add members" ON public.business_members FOR INSERT
  TO authenticated WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager'));
CREATE POLICY "Managers can update members" ON public.business_members FOR UPDATE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager'));
CREATE POLICY "Owners can remove members" ON public.business_members FOR DELETE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'owner'));
CREATE POLICY "Self insert as first owner" ON public.business_members FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.created_by = auth.uid())
  );

-- verification_requests
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  doc_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id uuid,
  decided_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own requests" ON public.verification_requests FOR SELECT
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Managers submit requests" ON public.verification_requests FOR INSERT
  TO authenticated WITH CHECK (public.is_business_member(business_id, auth.uid(), 'manager') AND submitted_by = auth.uid());
CREATE POLICY "Admins decide" ON public.verification_requests FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_verification_updated BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
