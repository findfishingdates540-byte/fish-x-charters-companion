
-- Storage policies for business-media (path: <business_id>/...)
CREATE POLICY "biz-media read authed" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'business-media');
CREATE POLICY "biz-media members write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'business-media'
    AND public.is_business_member((split_part(name,'/',1))::uuid, auth.uid(), 'staff')
  );
CREATE POLICY "biz-media members update" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'business-media'
    AND public.is_business_member((split_part(name,'/',1))::uuid, auth.uid(), 'staff')
  );
CREATE POLICY "biz-media members delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'business-media'
    AND public.is_business_member((split_part(name,'/',1))::uuid, auth.uid(), 'manager')
  );

-- post-media (path: <business_id>/...)
CREATE POLICY "post-media read authed" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'post-media');
CREATE POLICY "post-media members write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'post-media'
    AND public.is_business_member((split_part(name,'/',1))::uuid, auth.uid(), 'staff')
  );
CREATE POLICY "post-media members delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'post-media'
    AND public.is_business_member((split_part(name,'/',1))::uuid, auth.uid(), 'staff')
  );

-- avatars (path: <user_id>/...)
CREATE POLICY "avatars read authed" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars owner write" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars' AND (split_part(name,'/',1))::uuid = auth.uid());
CREATE POLICY "avatars owner update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'avatars' AND (split_part(name,'/',1))::uuid = auth.uid());
CREATE POLICY "avatars owner delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars' AND (split_part(name,'/',1))::uuid = auth.uid());

-- verification-docs (path: <business_id>/...)
CREATE POLICY "verify admins read" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'verification-docs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "verify managers upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'verification-docs'
    AND public.is_business_member((split_part(name,'/',1))::uuid, auth.uid(), 'manager')
  );

-- Tighten business_messages recipient-mark-read to only allow read_at update
DROP POLICY IF EXISTS "Recipients mark read" ON public.business_messages;
CREATE POLICY "Recipients mark read" ON public.business_messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.business_conversations c
      WHERE c.id = conversation_id
        AND (
          (auth.uid() = c.angler_id AND sender_side = 'business')
          OR (public.is_business_member(c.business_id, auth.uid(), 'staff') AND sender_side = 'angler')
        )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_conversations c
      WHERE c.id = conversation_id
        AND (
          (auth.uid() = c.angler_id AND sender_side = 'business')
          OR (public.is_business_member(c.business_id, auth.uid(), 'staff') AND sender_side = 'angler')
        )
    )
  );
