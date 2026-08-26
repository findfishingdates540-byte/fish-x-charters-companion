DELETE FROM public.business_members bm
USING public.businesses b
WHERE bm.business_id = b.id
  AND bm.user_id = 'f75c949a-29b5-4c76-98d8-d160ae495589'
  AND b.slug IN (
    'blue-marlin-charters','reel-chaser-sportfishing','deep-hull-offshore','salt-sail-charters',
    'lowcountry-fly-guides','backwater-bass-guides','coastal-tackle-co-','the-rigging-loft',
    'bait-barn-ice','harborlight-marina','sea-breeze-yacht-basin','anchor-bay-fishing-lodge',
    'tidewater-apparel','fathom-gear-works'
  );