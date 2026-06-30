
-- =========================================================
-- Helpers
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- Roles
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('captain', 'admin');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles: read own" ON public.profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile and grant captain role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'captain')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Boats
-- =========================================================
CREATE TABLE public.boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  make TEXT,
  model TEXT,
  length_ft NUMERIC(5,1),
  capacity INTEGER NOT NULL DEFAULT 4,
  hero_image_url TEXT,
  description TEXT,
  home_port TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boats TO authenticated;
GRANT ALL ON public.boats TO service_role;
ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Boats: captain manages own" ON public.boats FOR ALL TO authenticated
  USING (captain_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (captain_id = (SELECT auth.uid()));
CREATE INDEX boats_captain_idx ON public.boats(captain_id);
CREATE TRIGGER trg_boats_updated BEFORE UPDATE ON public.boats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Trip templates (charter packages)
-- =========================================================
CREATE TABLE public.trip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES public.boats(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT,
  duration_hours NUMERIC(4,1) NOT NULL DEFAULT 4,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  max_anglers INTEGER NOT NULL DEFAULT 4,
  description TEXT,
  hero_image_url TEXT,
  target_species TEXT[] NOT NULL DEFAULT '{}',
  includes TEXT[] NOT NULL DEFAULT '{}',
  departure_location TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_templates TO authenticated;
GRANT ALL ON public.trip_templates TO service_role;
ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates: captain manages own" ON public.trip_templates FOR ALL TO authenticated
  USING (captain_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (captain_id = (SELECT auth.uid()));
CREATE INDEX trip_templates_captain_idx ON public.trip_templates(captain_id);
CREATE TRIGGER trg_trip_templates_updated BEFORE UPDATE ON public.trip_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Customers (captain's roster)
-- =========================================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  fishx_user_id UUID, -- optional bridge to consumer Fish-X angler
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers: captain manages own" ON public.customers FOR ALL TO authenticated
  USING (captain_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (captain_id = (SELECT auth.uid()));
CREATE INDEX customers_captain_idx ON public.customers(captain_id);
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Bookings
-- =========================================================
CREATE TYPE public.booking_status AS ENUM (
  'inquiry', 'pending_deposit', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.trip_templates(id) ON DELETE SET NULL,
  boat_id UUID REFERENCES public.boats(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  trip_date DATE NOT NULL,
  start_time TIME,
  party_size INTEGER NOT NULL DEFAULT 1,
  status public.booking_status NOT NULL DEFAULT 'inquiry',
  total_cents INTEGER NOT NULL DEFAULT 0,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  payout_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookings: captain manages own" ON public.bookings FOR ALL TO authenticated
  USING (captain_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (captain_id = (SELECT auth.uid()));
CREATE INDEX bookings_captain_idx ON public.bookings(captain_id);
CREATE INDEX bookings_trip_date_idx ON public.bookings(trip_date);
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
