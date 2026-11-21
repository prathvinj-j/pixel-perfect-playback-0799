do $$
declare
  s1 uuid := 'a1111111-1111-4111-8111-111111111111';
  s2 uuid := 'a2222222-2222-4222-8222-222222222222';
  b1 uuid := 'b1111111-1111-4111-8111-111111111111';
  b2 uuid := 'b2222222-2222-4222-8222-222222222222';
  b3 uuid := 'b3333333-3333-4333-8333-333333333333';
  u record;
  p uuid;
  a uuid;
begin
  for u in
    select * from (values
      (s1, 'seller@hammerline.demo', 'Marlow & Finch Vintage', 'seller'),
      (s2, 'seller2@hammerline.demo', 'Kiln & Grain Studio', 'seller'),
      (b1, 'buyer@hammerline.demo', 'Priya Raman', 'buyer'),
      (b2, 'buyer2@hammerline.demo', 'Theo Lindqvist', 'buyer'),
      (b3, 'buyer3@hammerline.demo', 'Amara Okafor', 'buyer')
    ) as t(id, email, name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('HammerDemo!2026', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', u.name, 'role', u.role),
      now() - interval '30 days', now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now() - interval '30 days', now());
  end loop;

  update public.profiles set bio = 'Curated mid-century design, film cameras and vintage instruments. Every lot inspected and photographed in our Brooklyn studio.', location = 'Brooklyn, NY' where id = s1;
  update public.profiles set bio = 'Independent studio restoring furniture, lighting and collectible books. Ships worldwide with insured courier.', location = 'Portland, OR' where id = s2;
  update public.profiles set location = 'Bengaluru, IN' where id = b1;
  update public.profiles set location = 'Stockholm, SE' where id = b2;
  update public.profiles set location = 'Lagos, NG' where id = b3;

  -- 1 Camera (active)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s1, 'Leica-style 35mm Rangefinder, Silver Chrome', 'A beautifully preserved 1970s 35mm rangefinder in silver chrome with a 50mm f/2 prime. Shutter tested at all speeds, rangefinder patch bright and aligned, light meter accurate within a third of a stop. Includes original leather strap and lens cap.', 'Electronics', 'excellent', array['/images/products/camera.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s1, 850, 25, now() - interval '1 day', now() + interval '5 days', 'active') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b1, 900, now() - interval '20 hours'), (a, b2, 950, now() - interval '10 hours'), (a, b1, 1000, now() - interval '3 hours');
  update public.auctions set current_bid = 1000, highest_bidder_id = b1, bid_count = 3 where id = a;

  -- 2 Watch (completed, won by b3)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s1, '1964 Steel Dress Watch, Cream Dial', 'Hand-wound 1964 dress watch in a 34mm stainless steel case with an original cream dial and dauphine hands. Serviced last year, keeps time within +6 s/day. Fitted with a new brown calfskin strap.', 'Collectibles', 'good', array['/images/products/watch.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s1, 1200, 50, now() - interval '9 days', now() - interval '2 days', 'completed') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b2, 1250, now() - interval '8 days'), (a, b3, 1400, now() - interval '6 days'),
    (a, b2, 1500, now() - interval '4 days'), (a, b3, 1650, now() - interval '2 days 2 hours');
  update public.auctions set current_bid = 1650, highest_bidder_id = b3, bid_count = 4, winner_id = b3, final_price = 1650,
    closed_at = now() - interval '2 days', ending_soon_notified = true where id = a;
  insert into public.notifications (user_id, type, message, auction_id, read, created_at) values
    (b3, 'auction_won', 'You won "1964 Steel Dress Watch, Cream Dial" for $1,650.00!', a, false, now() - interval '2 days'),
    (b2, 'auction_lost', '"1964 Steel Dress Watch, Cream Dial" closed at $1,650.00. Another bidder won.', a, false, now() - interval '2 days'),
    (s1, 'auction_completed', '"1964 Steel Dress Watch, Cream Dial" sold for $1,650.00.', a, true, now() - interval '2 days');

  -- 3 Lounge chair (active)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s2, 'Mid-Century Walnut Lounge Chair', 'Bent-plywood lounge chair in figured walnut veneer with black aniline leather cushions. Shell refinished by hand; cushions original with a soft, even patina. Swivel base rotates smoothly.', 'Furniture', 'excellent', array['/images/products/lounge-chair.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s2, 1800, 50, now() - interval '2 days', now() + interval '3 days', 'active') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b3, 1850, now() - interval '30 hours'), (a, b1, 1950, now() - interval '6 hours');
  update public.auctions set current_bid = 1950, highest_bidder_id = b1, bid_count = 2 where id = a;

  -- 4 Guitar (ending soon)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s1, 'Vintage Sunburst Electric Guitar', 'Solid-body electric guitar in a three-tone sunburst nitro finish with honest play wear. Original pickups measure strong, frets have plenty of life left, neck is straight with a comfortable C profile. Comes with a period hard case.', 'Collectibles', 'good', array['/images/products/guitar.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s1, 2200, 100, now() - interval '6 days', now() + interval '3 hours', 'active') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b1, 2300, now() - interval '5 days'), (a, b2, 2500, now() - interval '3 days'),
    (a, b3, 2600, now() - interval '1 day'), (a, b2, 2800, now() - interval '2 hours');
  update public.auctions set current_bid = 2800, highest_bidder_id = b2, bid_count = 4 where id = a;
  insert into public.notifications (user_id, type, message, auction_id, created_at) values
    (b1, 'outbid', 'You were outbid on "Vintage Sunburst Electric Guitar". The new high bid is $2,800.00.', a, now() - interval '2 hours');

  -- 5 Handbag (active)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s2, 'Cognac Leather Top-Handle Bag', 'Structured top-handle bag in full-grain cognac leather with brushed gold hardware, suede-lined interior and detachable shoulder strap. Carried twice; corners and edges are pristine. Includes dust bag.', 'Fashion', 'like_new', array['/images/products/handbag.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s2, 640, 20, now() - interval '1 day', now() + interval '6 days', 'active') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values (a, b3, 660, now() - interval '5 hours');
  update public.auctions set current_bid = 660, highest_bidder_id = b3, bid_count = 1 where id = a;

  -- 6 Sneakers (completed, won by b1)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s1, 'Limited High-Top Sneakers, Navy/Red', 'Deadstock limited-run high-tops in white tumbled leather with navy and red overlays. US men''s size 10. Never worn, with original box, spare laces and receipt.', 'Fashion', 'new', array['/images/products/sneakers.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s1, 280, 10, now() - interval '8 days', now() - interval '1 day', 'completed') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b1, 290, now() - interval '7 days'), (a, b2, 320, now() - interval '4 days'), (a, b1, 350, now() - interval '1 day 3 hours');
  update public.auctions set current_bid = 350, highest_bidder_id = b1, bid_count = 3, winner_id = b1, final_price = 350,
    closed_at = now() - interval '1 day', ending_soon_notified = true where id = a;
  insert into public.notifications (user_id, type, message, auction_id, created_at) values
    (b1, 'auction_won', 'You won "Limited High-Top Sneakers, Navy/Red" for $350.00!', a, now() - interval '1 day'),
    (b2, 'auction_lost', '"Limited High-Top Sneakers, Navy/Red" closed at $350.00. Another bidder won.', a, now() - interval '1 day');

  -- 7 Keyboard (active, no bids yet)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s2, 'Custom 75% Mechanical Keyboard', 'Gasket-mount 75% keyboard in a bead-blasted aluminum case with lubed linear switches and navy/cream PBT keycaps. Hot-swap PCB, USB-C, programmable layers. Sounds deep and even.', 'Gadgets', 'like_new', array['/images/products/keyboard.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s2, 320, 10, now() - interval '3 hours', now() + interval '2 days', 'active');

  -- 8 Walkman (completed, won by b1)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s1, '1983 Portable Cassette Player', 'Iconic 1980s portable cassette player with original orange foam headphones. New belts fitted, plays at correct speed, auto-stop works. Light scuffs on the back plate.', 'Gadgets', 'good', array['/images/products/walkman.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s1, 120, 5, now() - interval '10 days', now() - interval '4 days', 'completed') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b3, 125, now() - interval '9 days'), (a, b1, 140, now() - interval '5 days');
  update public.auctions set current_bid = 140, highest_bidder_id = b1, bid_count = 2, winner_id = b1, final_price = 140,
    closed_at = now() - interval '4 days', ending_soon_notified = true where id = a;

  -- 9 Book (active)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s2, 'First-Edition 1965 Sci-Fi Hardcover', 'True first edition, first printing of a landmark 1965 science-fiction novel. Original dust jacket with chipping at the spine ends; boards clean and tight, no inscriptions. Housed in a new archival mylar cover.', 'Collectibles', 'fair', array['/images/products/book.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s2, 450, 25, now() - interval '2 days', now() + interval '4 days', 'active') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b2, 475, now() - interval '40 hours'), (a, b3, 525, now() - interval '20 hours'), (a, b2, 575, now() - interval '4 hours');
  update public.auctions set current_bid = 575, highest_bidder_id = b2, bid_count = 3 where id = a;

  -- 10 Side table (completed, no bids)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s2, 'Carrara Marble Side Table, Brass Base', 'Round 45cm side table with a honed Carrara marble top on a slim solid-brass pedestal. Marble sealed and free of chips; brass left unlacquered to develop a natural patina.', 'Furniture', 'excellent', array['/images/products/side-table.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status, closed_at, ending_soon_notified)
    values (p, s2, 900, 25, now() - interval '7 days', now() - interval '3 days', 'completed', now() - interval '3 days', true) returning id into a;
  insert into public.notifications (user_id, type, message, auction_id, created_at) values
    (s2, 'auction_completed', '"Carrara Marble Side Table, Brass Base" ended with no bids.', a, now() - interval '3 days');

  -- 11 Drone (upcoming)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s1, 'Folding 4K Camera Drone', 'Compact folding drone with a 3-axis gimbal 4K camera, 34-minute flight time and obstacle sensing. Sealed in box with three batteries, charging hub and spare propellers.', 'Electronics', 'new', array['/images/products/drone.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s1, 700, 20, now() + interval '6 hours', now() + interval '5 days', 'upcoming');

  -- 12 Painting (upcoming)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s2, '"Tidewater" Abstract Oil on Canvas', 'Original abstract oil on canvas, 90 x 120 cm, in bold cobalt, coral and gold. Signed on the reverse and framed in a natural oak floater frame. Certificate of authenticity included.', 'Art', 'excellent', array['/images/products/painting.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s2, 2400, 100, now() + interval '2 days', now() + interval '9 days', 'upcoming');

  -- 13 Lamp (active)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s2, 'Brushed Brass Mid-Century Table Lamp', 'Mid-century table lamp in brushed brass with a hand-stitched cream linen drum shade. Rewired with a cloth cord and inline switch; takes a standard E26 bulb.', 'Furniture', 'like_new', array['/images/products/lamp.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s2, 260, 10, now() - interval '12 hours', now() + interval '8 days', 'active') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values (a, b1, 270, now() - interval '2 hours');
  update public.auctions set current_bid = 270, highest_bidder_id = b1, bid_count = 1 where id = a;

  -- 14 Console (active)
  insert into public.products (seller_id, name, description, category, condition, image_urls) values
    (s1, 'Retro Handheld Console, Smoke Edition', 'Translucent smoke-grey handheld console from the late 90s, fully working with a new screen lens and fresh contacts. Light surface wear. Includes two classic cartridges.', 'Gadgets', 'good', array['/images/products/console.jpg'])
    returning id into p;
  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
    values (p, s1, 180, 5, now() - interval '1 day', now() + interval '26 hours', 'active') returning id into a;
  insert into public.bids (auction_id, bidder_id, amount, created_at) values
    (a, b2, 185, now() - interval '20 hours'), (a, b3, 195, now() - interval '12 hours'),
    (a, b1, 210, now() - interval '6 hours'), (a, b2, 220, now() - interval '1 hour');
  update public.auctions set current_bid = 220, highest_bidder_id = b2, bid_count = 4 where id = a;
  insert into public.notifications (user_id, type, message, auction_id, created_at) values
    (b1, 'outbid', 'You were outbid on "Retro Handheld Console, Smoke Edition". The new high bid is $220.00.', a, now() - interval '1 hour');
end $$;