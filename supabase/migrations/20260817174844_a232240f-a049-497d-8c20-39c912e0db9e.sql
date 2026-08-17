-- 1. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.create_business_with_owner(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text,text,text,text,text,text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reserve_slot(uuid,integer,text,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_slot(uuid,integer,text,text,integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_listing_event(uuid,text,integer,jsonb,jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_listing_event(uuid,text,integer,jsonb,jsonb,text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.rank_listings(text,text[],integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rank_listings(text,text[],integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_business_member(uuid,uuid,public.business_member_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid,uuid,public.business_member_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.recompute_listing_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_listing_metrics() TO service_role;

REVOKE ALL ON FUNCTION public.freeze_escrow_on_dispute() FROM PUBLIC, anon, authenticated;

-- 2. Ownership-scoped storage reads
DROP POLICY IF EXISTS "avatars read authed" ON storage.objects;
CREATE POLICY "avatars owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (split_part(name, '/', 1))::uuid = auth.uid());

DROP POLICY IF EXISTS "biz-media read authed" ON storage.objects;
CREATE POLICY "biz-media members read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'business-media' AND public.is_business_member((split_part(name, '/', 1))::uuid, auth.uid(), 'staff'::public.business_member_role));

DROP POLICY IF EXISTS "post-media read authed" ON storage.objects;
CREATE POLICY "post-media members read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'post-media' AND public.is_business_member((split_part(name, '/', 1))::uuid, auth.uid(), 'staff'::public.business_member_role));