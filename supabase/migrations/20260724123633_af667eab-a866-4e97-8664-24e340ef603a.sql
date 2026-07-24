-- Curated pool of verified maritime Unsplash photos, themed by table
DO $$
DECLARE
  boats_pool text[] := ARRAY[
    '1544551763-46a013bb70d5','1502680390469-be75c86b636f','1507525428034-b723cf961d3e',
    '1533106418989-88406c7cc8ca','1518199266791-5375a83190b7','1470252649378-9c29740c9fa8',
    '1516414447565-b14be0adf13e','1524704654690-b56c05c78a00','1519452575417-564c1401ecc0',
    '1552074284-5e88ef1aef18'
  ];
  ocean_pool text[] := ARRAY[
    '1502691876148-a84978e59af8','1500375592092-40eb2168fd21','1439405326854-014607f694d7',
    '1518946222227-364f22132616','1444858291040-58f756a3bdd6','1493558103817-58b2924bce98'
  ];
  fish_pool text[] := ARRAY[
    '1500759285222-a95626b934cb','1502943693086-33b5b1cfdf2f','1516876437184-593fda40c7ce',
    '1516339901601-2e1b62dc0c45'
  ];
  all_pool text[];
  base text := 'https://images.unsplash.com/photo-';
  q1200 text := '?auto=format&fit=crop&w=1200&q=80';
  q1600 text := '?auto=format&fit=crop&w=1600&q=80';
  q400  text := '?auto=format&fit=crop&w=400&q=80';
  r record;
  idx int;
  pid text;
BEGIN
  all_pool := boats_pool || ocean_pool || fish_pool;

  -- Charters / services -> boats + ocean
  FOR r IN SELECT id FROM bookable_services LOOP
    idx := (abs(hashtext(r.id::text)) % (array_length(boats_pool,1) + array_length(ocean_pool,1))) + 1;
    pid := (boats_pool || ocean_pool)[idx];
    UPDATE bookable_services SET hero_url = base || pid || q1600 WHERE id = r.id;
  END LOOP;

  -- Businesses hero -> mixed maritime
  FOR r IN SELECT id FROM businesses LOOP
    idx := (abs(hashtext(r.id::text || 'hero')) % array_length(all_pool,1)) + 1;
    pid := all_pool[idx];
    UPDATE businesses SET hero_url = base || pid || q1600 WHERE id = r.id;

    -- Business logo: keep small ocean/boat crop
    idx := (abs(hashtext(r.id::text || 'logo')) % (array_length(boats_pool,1) + array_length(ocean_pool,1))) + 1;
    pid := (boats_pool || ocean_pool)[idx];
    UPDATE businesses SET logo_url = base || pid || q400 WHERE id = r.id;
  END LOOP;

  -- Boats -> boats_pool
  FOR r IN SELECT id FROM boats LOOP
    idx := (abs(hashtext(r.id::text)) % array_length(boats_pool,1)) + 1;
    pid := boats_pool[idx];
    UPDATE boats SET hero_image_url = base || pid || q1600 WHERE id = r.id;
  END LOOP;

  -- Trip templates -> boats + fish
  FOR r IN SELECT id FROM trip_templates LOOP
    idx := (abs(hashtext(r.id::text)) % (array_length(boats_pool,1) + array_length(fish_pool,1))) + 1;
    pid := (boats_pool || fish_pool)[idx];
    UPDATE trip_templates SET hero_image_url = base || pid || q1600 WHERE id = r.id;
  END LOOP;

  -- Products -> fish + boats (gear/tackle themed shots)
  FOR r IN SELECT id FROM inventory_products LOOP
    idx := (abs(hashtext(r.id::text)) % (array_length(fish_pool,1) + array_length(boats_pool,1))) + 1;
    pid := (fish_pool || boats_pool)[idx];
    UPDATE inventory_products
      SET images = jsonb_build_array(base || pid || q1200)
      WHERE id = r.id;
  END LOOP;

  -- Business posts media_json -> ocean + fish + boats
  FOR r IN SELECT id FROM business_posts WHERE jsonb_array_length(COALESCE(media_json,'[]'::jsonb)) > 0 LOOP
    idx := (abs(hashtext(r.id::text)) % array_length(all_pool,1)) + 1;
    pid := all_pool[idx];
    UPDATE business_posts
      SET media_json = jsonb_build_array(jsonb_build_object('type','image','url', base || pid || q1200))
      WHERE id = r.id;
  END LOOP;
END $$;