-- Remove seeded captain/business_owner roles from users whose original signup role was angler
DELETE FROM public.user_roles ur
WHERE ur.role IN ('captain','business_owner')
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
      AND ur2.role = 'angler'
      AND ur2.created_at < ur.created_at
  );