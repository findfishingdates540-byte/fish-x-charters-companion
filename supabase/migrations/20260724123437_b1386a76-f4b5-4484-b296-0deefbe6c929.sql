-- Replace broken Unsplash photo IDs with working ones across all media columns
DO $$
DECLARE
  pairs text[][] := ARRAY[
    ['1449960752016-53072a41c0f3','1502680390469-be75c86b636f'],
    ['1512253022256-19f2f900f8ac','1470252649378-9c29740c9fa8'],
    ['1520637836862-4d197d17c65a','1544551763-46a013bb70d5'],
    ['1520637836862-4d197d17c93a','1502691876148-a84978e59af8'],
    ['1544966503-7cc5ac882d5f','1502920917128-1aa500764cbd'],
    ['1568872722287-4d31c69f43dd','1568402102990-bc541580b59f']
  ];
  p text[];
BEGIN
  FOREACH p SLICE 1 IN ARRAY pairs LOOP
    UPDATE bookable_services SET hero_url = replace(hero_url, p[1], p[2]) WHERE hero_url LIKE '%'||p[1]||'%';
    UPDATE businesses SET hero_url = replace(hero_url, p[1], p[2]) WHERE hero_url LIKE '%'||p[1]||'%';
    UPDATE businesses SET logo_url = replace(logo_url, p[1], p[2]) WHERE logo_url LIKE '%'||p[1]||'%';
    UPDATE boats SET hero_image_url = replace(hero_image_url, p[1], p[2]) WHERE hero_image_url LIKE '%'||p[1]||'%';
    UPDATE trip_templates SET hero_image_url = replace(hero_image_url, p[1], p[2]) WHERE hero_image_url LIKE '%'||p[1]||'%';
    UPDATE inventory_products SET images = replace(images::text, p[1], p[2])::jsonb WHERE images::text LIKE '%'||p[1]||'%';
    UPDATE business_posts SET media_json = replace(media_json::text, p[1], p[2])::jsonb WHERE media_json::text LIKE '%'||p[1]||'%';
  END LOOP;
END $$;