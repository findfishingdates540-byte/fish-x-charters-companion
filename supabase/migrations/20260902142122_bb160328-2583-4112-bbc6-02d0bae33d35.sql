CREATE POLICY "Boats: public read for published business"
ON public.boats FOR SELECT TO anon, authenticated
USING (
  is_active AND business_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = boats.business_id AND b.is_published
  )
);

GRANT SELECT ON public.marina_slips TO anon;

CREATE POLICY "Marina slips: public read for published marina"
ON public.marina_slips FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = marina_slips.business_id AND b.is_published
  )
);