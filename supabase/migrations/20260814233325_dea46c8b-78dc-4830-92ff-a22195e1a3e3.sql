with pics(i, url) as (values
 (0,'/__l5e/assets-v1/2d7a5811-0f29-4a2e-903b-c0c56dfef2fa/marina-sunset.jpg'),
 (1,'/__l5e/assets-v1/8011dfbb-d804-4e32-85e5-4b8f1a9439d0/harbour-fleet.jpg'),
 (2,'/__l5e/assets-v1/f8fe804c-3d67-411c-a6a9-ea94ed60d402/marina-wide.jpg'),
 (3,'/__l5e/assets-v1/b3ef4c2f-a1a0-4323-95e1-16c3b551746a/morning-marina.jpg'),
 (4,'/__l5e/assets-v1/b51f3e7a-8497-47df-bcbf-5858986ce5c3/blue-harbour.jpg'),
 (5,'/__l5e/assets-v1/974196a8-fae8-4ba1-a605-f81299fff3e2/evening-berth.jpg'),
 (6,'/__l5e/assets-v1/fb7ee4e6-9baa-4d6b-9a5d-2a598ea0694f/quiet-basin.jpg'))
update public.businesses b
set hero_url = p.url
from pics p
where p.i = (abs(hashtext(b.id::text)) % 7)
  and (b.hero_url is null or b.hero_url like '%unsplash%');

with pics(i, url) as (values
 (0,'/__l5e/assets-v1/2d7a5811-0f29-4a2e-903b-c0c56dfef2fa/marina-sunset.jpg'),
 (1,'/__l5e/assets-v1/8011dfbb-d804-4e32-85e5-4b8f1a9439d0/harbour-fleet.jpg'),
 (2,'/__l5e/assets-v1/f8fe804c-3d67-411c-a6a9-ea94ed60d402/marina-wide.jpg'),
 (3,'/__l5e/assets-v1/b3ef4c2f-a1a0-4323-95e1-16c3b551746a/morning-marina.jpg'),
 (4,'/__l5e/assets-v1/b51f3e7a-8497-47df-bcbf-5858986ce5c3/blue-harbour.jpg'),
 (5,'/__l5e/assets-v1/974196a8-fae8-4ba1-a605-f81299fff3e2/evening-berth.jpg'),
 (6,'/__l5e/assets-v1/fb7ee4e6-9baa-4d6b-9a5d-2a598ea0694f/quiet-basin.jpg'))
update public.bookable_services s
set hero_url = p.url
from pics p
where p.i = (abs(hashtext(s.id::text)) % 7)
  and (s.hero_url is null or s.hero_url like '%unsplash%');