with pics(u, i) as (
  select u, row_number() over () - 1 from (values
    ('/__l5e/assets-v1/b51f3e7a-8497-47df-bcbf-5858986ce5c3/blue-harbour.jpg'),
    ('/__l5e/assets-v1/974196a8-fae8-4ba1-a605-f81299fff3e2/evening-berth.jpg'),
    ('/__l5e/assets-v1/8011dfbb-d804-4e32-85e5-4b8f1a9439d0/harbour-fleet.jpg'),
    ('/__l5e/assets-v1/53c15491-f85a-4cfb-aade-31ccfc176a60/marina-03.jpg'),
    ('/__l5e/assets-v1/d453a023-9f4a-4888-88fc-3b2492c6844b/marina-04.jpg'),
    ('/__l5e/assets-v1/50bbd0f5-72b6-4437-8a4f-fa0ca3241a90/marina-05.jpg'),
    ('/__l5e/assets-v1/84437c80-9d74-477e-a157-3dabbee69b6c/marina-06.jpg'),
    ('/__l5e/assets-v1/6cfa14e1-f7ec-4f1f-a5c3-e49dcbd40e0f/marina-07.jpg'),
    ('/__l5e/assets-v1/9d37de46-6d8f-4210-a02a-9140a34da760/marina-08.jpg'),
    ('/__l5e/assets-v1/470fc8aa-f13e-4dfa-bdf9-30946bbca2d9/marina-09.jpg'),
    ('/__l5e/assets-v1/49957760-5e7b-473a-b956-f7104375fe08/marina-11.jpg'),
    ('/__l5e/assets-v1/32f0db40-18ea-4dce-b5d4-0d1e72e6d390/marina-12.jpg'),
    ('/__l5e/assets-v1/0f11d818-6faa-4e8e-8fb1-50762e1328cd/marina-13.jpg'),
    ('/__l5e/assets-v1/061cb0c8-df13-4076-8962-d714474162bd/marina-15.jpg'),
    ('/__l5e/assets-v1/abc269b9-8ce5-4b8e-b56d-5d39283a2d81/marina-16.jpg'),
    ('/__l5e/assets-v1/7b446459-2de9-4544-afd8-88a8e9f1aaa8/marina-19.jpg'),
    ('/__l5e/assets-v1/2d7a5811-0f29-4a2e-903b-c0c56dfef2fa/marina-sunset.jpg'),
    ('/__l5e/assets-v1/f8fe804c-3d67-411c-a6a9-ea94ed60d402/marina-wide.jpg'),
    ('/__l5e/assets-v1/b3ef4c2f-a1a0-4323-95e1-16c3b551746a/morning-marina.jpg'),
    ('/__l5e/assets-v1/fb7ee4e6-9baa-4d6b-9a5d-2a598ea0694f/quiet-basin.jpg')
  ) as v(u)
),
svc as (
  select id, (row_number() over (order by created_at, id) - 1) % 20 as i
  from public.bookable_services
  where hero_url is null or hero_url like '/__l5e/assets-v1/%' or hero_url like '%unsplash%'
)
update public.bookable_services s
set hero_url = p.u
from svc, pics p
where s.id = svc.id and p.i = svc.i;

with pics(u, i) as (
  select u, row_number() over () - 1 from (values
    ('/__l5e/assets-v1/b51f3e7a-8497-47df-bcbf-5858986ce5c3/blue-harbour.jpg'),
    ('/__l5e/assets-v1/974196a8-fae8-4ba1-a605-f81299fff3e2/evening-berth.jpg'),
    ('/__l5e/assets-v1/8011dfbb-d804-4e32-85e5-4b8f1a9439d0/harbour-fleet.jpg'),
    ('/__l5e/assets-v1/53c15491-f85a-4cfb-aade-31ccfc176a60/marina-03.jpg'),
    ('/__l5e/assets-v1/d453a023-9f4a-4888-88fc-3b2492c6844b/marina-04.jpg'),
    ('/__l5e/assets-v1/50bbd0f5-72b6-4437-8a4f-fa0ca3241a90/marina-05.jpg'),
    ('/__l5e/assets-v1/84437c80-9d74-477e-a157-3dabbee69b6c/marina-06.jpg'),
    ('/__l5e/assets-v1/6cfa14e1-f7ec-4f1f-a5c3-e49dcbd40e0f/marina-07.jpg'),
    ('/__l5e/assets-v1/9d37de46-6d8f-4210-a02a-9140a34da760/marina-08.jpg'),
    ('/__l5e/assets-v1/470fc8aa-f13e-4dfa-bdf9-30946bbca2d9/marina-09.jpg'),
    ('/__l5e/assets-v1/49957760-5e7b-473a-b956-f7104375fe08/marina-11.jpg'),
    ('/__l5e/assets-v1/32f0db40-18ea-4dce-b5d4-0d1e72e6d390/marina-12.jpg'),
    ('/__l5e/assets-v1/0f11d818-6faa-4e8e-8fb1-50762e1328cd/marina-13.jpg'),
    ('/__l5e/assets-v1/061cb0c8-df13-4076-8962-d714474162bd/marina-15.jpg'),
    ('/__l5e/assets-v1/abc269b9-8ce5-4b8e-b56d-5d39283a2d81/marina-16.jpg'),
    ('/__l5e/assets-v1/7b446459-2de9-4544-afd8-88a8e9f1aaa8/marina-19.jpg'),
    ('/__l5e/assets-v1/2d7a5811-0f29-4a2e-903b-c0c56dfef2fa/marina-sunset.jpg'),
    ('/__l5e/assets-v1/f8fe804c-3d67-411c-a6a9-ea94ed60d402/marina-wide.jpg'),
    ('/__l5e/assets-v1/b3ef4c2f-a1a0-4323-95e1-16c3b551746a/morning-marina.jpg'),
    ('/__l5e/assets-v1/fb7ee4e6-9baa-4d6b-9a5d-2a598ea0694f/quiet-basin.jpg')
  ) as v(u)
),
biz as (
  select id, ((row_number() over (order by created_at, id) - 1) * 3 + 7) % 20 as i
  from public.businesses
  where hero_url is null or hero_url like '/__l5e/assets-v1/%' or hero_url like '%unsplash%'
)
update public.businesses b
set hero_url = p.u
from biz, pics p
where b.id = biz.id and p.i = biz.i;