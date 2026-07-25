CREATE OR REPLACE FUNCTION public.create_business_with_owner(
  _name text,
  _slug text,
  _category_key text,
  _city text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _description text DEFAULT NULL
) RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  biz public.businesses;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'business_owner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.businesses (name, slug, category_key, city, phone, description, created_by)
  VALUES (_name, _slug, _category_key, _city, _phone, _description, uid)
  RETURNING * INTO biz;

  INSERT INTO public.business_members (business_id, user_id, role)
  VALUES (biz.id, uid, 'owner'::public.business_member_role)
  ON CONFLICT DO NOTHING;

  RETURN biz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text, text, text, text, text, text) TO authenticated;