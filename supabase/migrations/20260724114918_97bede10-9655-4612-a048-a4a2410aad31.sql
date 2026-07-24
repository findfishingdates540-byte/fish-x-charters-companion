
DO $$
DECLARE
  u_captain uuid := 'f75c949a-29b5-4c76-98d8-d160ae495589';
  u_angler  uuid := '6abb99b8-68fa-4a7f-8f90-9c393b8a87a1';
  b_id uuid; s_id uuid; boat_id uuid; cust_id uuid;
  i int;
  categories text[] := ARRAY['charter','charter','charter','charter','guide_service','guide_service','tackle_shop','tackle_shop','bait_shop','marina','marina','lodge','apparel','gear_mfg'];
  names text[] := ARRAY[
    'Blue Marlin Charters','Reel Chaser Sportfishing','Deep Hull Offshore','Salt & Sail Charters',
    'Lowcountry Fly Guides','Backwater Bass Guides','Coastal Tackle Co.','The Rigging Loft',
    'Bait Barn & Ice','Harborlight Marina','Sea Breeze Yacht Basin','Anchor Bay Fishing Lodge',
    'Tidewater Apparel','Fathom Gear Works'
  ];
  cities text[] := ARRAY['Destin, FL','Key West, FL','Ocean City, MD','Charleston, SC','Charleston, SC','Austin, TX','Wilmington, NC','Miami, FL','Islamorada, FL','Annapolis, MD','San Diego, CA','Homer, AK','Portland, ME','Newport, RI'];
  taglines text[] := ARRAY[
    'Blue water. Big fish. No excuses.',
    'Sunrise runs, sunset stories.',
    'Offshore adventures in the Mid-Atlantic.',
    'Half-day sails, full-day memories.',
    'Sight-casting redfish on the fly.',
    'Trophy largemouth on Texas lakes.',
    'Everything for the modern angler.',
    'Custom rods, expert rigs.',
    'Live bait, cold drinks, warm smiles.',
    'Deep-water slips in the heart of the harbor.',
    'Your Pacific home port.',
    'Cabins on the cove. Coffee on the dock.',
    'Sun-tested performance apparel.',
    'Precision reels, forged for saltwater.'
  ];
BEGIN
  INSERT INTO profiles(id, full_name, display_name)
  VALUES (u_captain,'Sam Rivers','Capt. Sam'),(u_angler,'Jordan Bay','Jordan')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles(user_id, role) VALUES
    (u_captain,'captain'),(u_captain,'business_owner'),(u_angler,'angler')
  ON CONFLICT DO NOTHING;

  FOR i IN 1..4 LOOP
    INSERT INTO boats(captain_id,name,make,model,length_ft,capacity,home_port,description,hero_image_url)
    VALUES (u_captain,
      (ARRAY['Blue Horizon','Reel Deal','Salt Runner','Deep Blue'])[i],
      (ARRAY['Contender','Yellowfin','Grady-White','SeaVee'])[i],
      (ARRAY['39ST','42','Canyon 376','340Z'])[i],
      (ARRAY[39,42,37,34])[i], (ARRAY[6,8,6,6])[i],
      (ARRAY['Destin, FL','Key West, FL','Ocean City, MD','Charleston, SC'])[i],
      'Twin-engine offshore sportfisher rigged for tuna, marlin and mahi.',
      'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=1200')
    RETURNING id INTO boat_id;

    INSERT INTO trip_templates(captain_id,boat_id,title,slug,duration_hours,base_price_cents,max_anglers,description,hero_image_url,target_species,includes,departure_location,is_published)
    VALUES
      (u_captain,boat_id,'Half-Day Inshore','half-day-'||i,4,45000,6,'Inshore fishing for reds, trout and flounder. Bait and tackle included.',
        'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=1200',
        ARRAY['Redfish','Speckled Trout','Flounder'],ARRAY['Bait','Tackle','Ice','Fish cleaning'],
        (ARRAY['Destin, FL','Key West, FL','Ocean City, MD','Charleston, SC'])[i],true),
      (u_captain,boat_id,'Full-Day Offshore','full-day-'||i,8,110000,6,'Run the canyons for tuna, mahi and wahoo. Fuel and heavy tackle included.',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
        ARRAY['Yellowfin Tuna','Mahi-Mahi','Wahoo','Marlin'],ARRAY['Fuel','Heavy tackle','Lunch','Ice'],
        (ARRAY['Destin, FL','Key West, FL','Ocean City, MD','Charleston, SC'])[i],true);
  END LOOP;

  FOR i IN 1..array_length(categories,1) LOOP
    INSERT INTO businesses(slug,name,category_key,tagline,description,hero_url,logo_url,
      website,phone,email,city,region,country,is_published,verified_at,created_by,charges_enabled,payouts_enabled,commission_rate)
    VALUES (
      lower(regexp_replace(names[i],'[^a-zA-Z0-9]+','-','g')),
      names[i], categories[i], taglines[i],
      'Family-run fishing outfit serving anglers since 2011. We specialize in memorable days on the water for guests of every experience level, from first-timers to tournament regulars.',
      (ARRAY[
        'https://images.unsplash.com/photo-1502691876148-a84978e59af8?w=1600',
        'https://images.unsplash.com/photo-1518877593221-1f28583780b4?w=1600',
        'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=1600',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600'
      ])[1 + (i % 4)],
      'https://images.unsplash.com/photo-1526401485004-46910ecc8e51?w=200',
      'https://'||lower(regexp_replace(names[i],'[^a-zA-Z0-9]+','','g'))||'.com',
      '+1-555-01'||lpad(i::text,2,'0'),
      'hello@'||lower(regexp_replace(names[i],'[^a-zA-Z0-9]+','','g'))||'.com',
      split_part(cities[i],',',1), trim(split_part(cities[i],',',2)), 'US',
      true, now() - (i||' days')::interval, u_captain, true, true, 0.10
    ) RETURNING id INTO b_id;

    INSERT INTO business_members(business_id,user_id,role) VALUES (b_id,u_captain,'owner')
    ON CONFLICT DO NOTHING;
    INSERT INTO business_followers(business_id,user_id) VALUES (b_id,u_angler) ON CONFLICT DO NOTHING;

    INSERT INTO business_posts(business_id,author_id,body,visibility) VALUES
      (b_id,u_captain,'Bite is on — clients boated three tuna over 60 lbs this morning. A few open dates next week.','public'),
      (b_id,u_captain,'New season, new gear. Stocked up on fresh leaders, fluoro and topwater plugs.','public'),
      (b_id,u_captain,'Weather looking clean this weekend — grab an open half-day while they last.','public');

    IF categories[i] IN ('charter','guide_service','marina','lodge') THEN
      INSERT INTO bookable_services(business_id,kind,title,slug,description,hero_url,duration_minutes,capacity,base_price_cents,deposit_cents,includes,target_species,departure_location,is_published)
      VALUES (b_id,
        CASE categories[i] WHEN 'charter' THEN 'charter_trip'::service_kind
                           WHEN 'guide_service' THEN 'guided_trip'::service_kind
                           WHEN 'marina' THEN 'slip_rental'::service_kind
                           ELSE 'lodging'::service_kind END,
        (ARRAY['Half-Day Nearshore','Sunrise Guided Wade','Overnight Slip','Waterfront Cabin — 2 Nights'])[1 + (i % 4)],
        'service-'||i||'-a',
        'Signature experience curated for small groups. All required gear and refreshments included.',
        'https://images.unsplash.com/photo-1520637836862-4d197d17c93a?w=1200',
        240, 6, 45000 + (i*5000), 10000, ARRAY['Gear','Bait','Ice','Guide'], ARRAY['Redfish','Trout','Snook'],
        cities[i], true) RETURNING id INTO s_id;

      INSERT INTO service_availability(service_id,starts_at,ends_at,seats_available)
      SELECT s_id,
        (current_date + d)::timestamptz + time '07:00',
        (current_date + d)::timestamptz + time '11:00',
        6
      FROM generate_series(1,14) d;

      INSERT INTO bookable_services(business_id,kind,title,slug,description,hero_url,duration_minutes,capacity,base_price_cents,deposit_cents,includes,target_species,departure_location,is_published)
      VALUES (b_id,'charter_trip','Full-Day Offshore','service-'||i||'-b',
        'Push offshore for pelagics. Heavy tackle, fuel, and lunch included.',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
        480,6,120000+(i*5000),25000,ARRAY['Fuel','Heavy tackle','Lunch'],ARRAY['Tuna','Marlin','Mahi'],cities[i],true);

      INSERT INTO listing_metrics(service_id,business_id,avg_rating,review_count,response_rate,response_time_ms,acceptance_rate,cancellation_rate,no_show_rate,booking_velocity_30d,impressions_30d,bookings_30d,last_availability_at,computed_at)
      VALUES (s_id,b_id, 4.4 + (i%5)*0.1, 12+i*3, 0.94, 3600000, 0.92, 0.04, 0.02, 8+i, 400+i*40, 6+i, now(), now());

      INSERT INTO customers(captain_id,full_name,email,phone)
      VALUES (u_captain,'Alex Rivera '||i,'alex'||i||'@example.com','+1-555-020'||i)
      RETURNING id INTO cust_id;

      INSERT INTO bookings(captain_id,business_id,service_id,customer_id,trip_date,start_time,party_size,status,total_cents,deposit_cents,payout_cents,notes) VALUES
        (u_captain,b_id,s_id,cust_id, current_date - (7+i), time '07:00', 4,'completed', 60000, 15000, 54000,'Great day, tuna limit.'),
        (u_captain,b_id,s_id,cust_id, current_date + (2+i), time '07:00', 3,'confirmed',  55000, 15000, 49500,'Bring rain jackets.'),
        (u_captain,b_id,s_id,cust_id, current_date + (10+i), time '13:00',2,'pending_payment',45000, 10000, 40500,'Deposit pending.');
    END IF;

    IF categories[i] = 'marina' THEN
      INSERT INTO marina_slips(business_id,slip_number,length_ft,beam_ft,draft_ft,amperage,monthly_rate_cents,nightly_rate_cents,status)
      SELECT b_id, 'A-'||g, 30+g*2, 12, 5, '30/50A', 65000+g*5000, 8500+g*300,
        (ARRAY['available','occupied','available','maintenance'])[1+(g%4)]
      FROM generate_series(1,10) g;
    END IF;

    IF categories[i] IN ('tackle_shop','bait_shop','apparel','gear_mfg') THEN
      INSERT INTO inventory_products(business_id,sku,title,description,category,price_cents,compare_at_cents,stock_qty,low_stock_threshold,images,is_published)
      SELECT b_id,'SKU-'||i||'-'||g,
        (ARRAY['Topwater Plug','Fluorocarbon Leader 40lb','UV Performance Hoodie','Offshore Spinning Reel 8000','Circle Hooks (25pk)','Fillet Knife 9"'])[1+(g%6)],
        'Angler-tested. Field-proven. Built for hard days on the water.',
        (ARRAY['Lures','Line','Apparel','Reels','Terminal','Tools'])[1+(g%6)],
        (ARRAY[1899,1299,5900,32900,899,4200])[1+(g%6)],
        (ARRAY[2400,1600,7500,39900,1200,5200])[1+(g%6)],
        20+g*3, 5,
        jsonb_build_array('https://images.unsplash.com/photo-1611258569568-fca7a1d2a3ca?w=800'),
        true
      FROM generate_series(1,8) g;
    END IF;

    INSERT INTO inquiries(business_id,from_user_id,guest_name,guest_email,party_size,preferred_date,message,status) VALUES
      (b_id,u_angler,'Jordan Bay','jordan@example.com',4, current_date + 12,'Looking for a full-day offshore for 4 anglers. Any Saturdays open?','new'),
      (b_id,NULL,'Priya Shah','priya@example.com',2, current_date + 5,'Two of us, first time offshore — any beginner-friendly options?','replied');
  END LOOP;

  INSERT INTO reviews(booking_id,business_id,angler_id,rating,body,response_body)
  SELECT bk.id, bk.business_id, u_angler,
    4 + ((row_number() over ())::int % 2),
    (ARRAY[
      'Best day on the water — captain put us on fish all morning.',
      'Boat was spotless, gear was top notch. Would rebook tomorrow.',
      'Absolute pros. Kids caught their first tuna!',
      'Great communication start to finish. Highly recommend.',
      'Fun crew, big fish, easy booking. 10/10.'
    ])[1+((row_number() over ())::int % 5)],
    'Thanks for fishing with us — see you next season!'
  FROM bookings bk
  WHERE bk.status='completed'
  LIMIT 20;
END $$;
