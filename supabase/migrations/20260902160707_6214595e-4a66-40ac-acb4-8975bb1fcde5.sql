UPDATE public.charters c
SET is_published = true, updated_at = now()
WHERE c.is_published = false
  AND EXISTS (
    SELECT 1 FROM public.bookable_services s
    WHERE s.charter_id = c.id AND s.is_published = true
  );