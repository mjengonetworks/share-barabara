-- ===== TOP UP PLACEHOLDER CONTENT TO AT LEAST 10 ROWS PER TABLE =====
-- Extends the first placeholder pass (20260828120000) with 4 more demo
-- accounts and enough additional rows in every content table so lists,
-- filters and admin queues have a realistic amount of data to browse.

-- ----- 4 more demo auth users -----
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000000', '6e4d6549-bf6d-4992-9665-39738d2af438', 'authenticated', 'authenticated',
   'sarah.wafula@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Sarah Wafula"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e', 'authenticated', 'authenticated',
   'james.kariuki@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"James Kariuki"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '62935ae1-3e1e-4375-98d6-1c05034841d6', 'authenticated', 'authenticated',
   'fatuma.abdi@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Fatuma Abdi"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '70053218-2662-4ac6-ae28-154ff497a5ff', 'authenticated', 'authenticated',
   'michael.otundo@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Michael Otundo"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) VALUES
  (gen_random_uuid(), '6e4d6549-bf6d-4992-9665-39738d2af438', '6e4d6549-bf6d-4992-9665-39738d2af438',
   '{"sub":"6e4d6549-bf6d-4992-9665-39738d2af438","email":"sarah.wafula@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e', 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e',
   '{"sub":"eb986179-ee3b-453f-bf7e-ff7e7e7b264e","email":"james.kariuki@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), '62935ae1-3e1e-4375-98d6-1c05034841d6', '62935ae1-3e1e-4375-98d6-1c05034841d6',
   '{"sub":"62935ae1-3e1e-4375-98d6-1c05034841d6","email":"fatuma.abdi@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), '70053218-2662-4ac6-ae28-154ff497a5ff', '70053218-2662-4ac6-ae28-154ff497a5ff',
   '{"sub":"70053218-2662-4ac6-ae28-154ff497a5ff","email":"michael.otundo@sharebarabara.test","email_verified":true}', 'email', now(), now());

UPDATE public.profiles SET county = 'Bungoma', occupation = 'Road safety trainer',
  bio = 'Runs defensive-riding clinics for boda boda saccos across western Kenya.',
  road_safety_message = 'Training saves more lives than fines ever will.'
  WHERE id = '6e4d6549-bf6d-4992-9665-39738d2af438';
UPDATE public.profiles SET county = 'Machakos', occupation = 'Civil engineer, county roads department',
  bio = 'Designs junction and signage improvements for Machakos county roads.',
  road_safety_message = 'Good engineering removes the need for good luck.'
  WHERE id = 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e';
UPDATE public.profiles SET county = 'Garissa', occupation = 'Kenya Red Cross volunteer',
  bio = 'First responder for road crashes along the Garissa corridor for eight years.',
  road_safety_message = 'The first ten minutes after a crash decide everything. Know basic first aid.'
  WHERE id = '62935ae1-3e1e-4375-98d6-1c05034841d6';
UPDATE public.profiles SET county = 'Kilifi', occupation = 'Driving instructor',
  bio = 'Teaches new drivers on the coast, focused on hazard perception and night driving.',
  road_safety_message = 'A confident driver checks mirrors. A safe driver checks twice.'
  WHERE id = '70053218-2662-4ac6-ae28-154ff497a5ff';

INSERT INTO public.notification_preferences (user_id) VALUES
  ('6e4d6549-bf6d-4992-9665-39738d2af438'), ('eb986179-ee3b-453f-bf7e-ff7e7e7b264e'),
  ('62935ae1-3e1e-4375-98d6-1c05034841d6'), ('70053218-2662-4ac6-ae28-154ff497a5ff')
ON CONFLICT DO NOTHING;

-- ----- 4 more roads (total 10) -----
INSERT INTO public.roads (id, name, slug, county, road_class, authority, surface) VALUES
  ('08117459-a727-4185-affd-d5c5999c8e73', 'Southern Bypass', 'southern-bypass', 'Nairobi', 'Urban', 'KURA', 'Tarmac'),
  ('4428ce0d-01fb-448c-9288-82df47ade767', 'Garissa Road', 'garissa-road', 'Machakos', 'Class A', 'KeNHA', 'Tarmac'),
  ('ec39b16a-f000-4ce1-80d4-3c978f7764cb', 'Kakamega-Bungoma Road', 'kakamega-bungoma-road', 'Bungoma', 'Class B', 'KeNHA', 'Tarmac'),
  ('fa4ce3e2-b4ed-44b9-a661-457b218d80aa', 'Nyeri-Nanyuki Road', 'nyeri-nanyuki-road', 'Nyeri', 'Class A', 'KeNHA', 'Tarmac');

-- ----- 4 more pages (total 10) -----
INSERT INTO public.pages (id, owner_id, slug, name, category, description, county, website_url, phone, verified) VALUES
  ('12936e94-8257-4bf5-a3b1-a88491fad3e6', '62935ae1-3e1e-4375-98d6-1c05034841d6', 'kenya-red-cross-society',
   'Kenya Red Cross Society', 'NGO / advocacy', 'Emergency response, first aid training and ambulance services nationwide.', 'Nairobi', 'https://redcross.example.or.ke', '1199', true),
  ('6d87029c-3035-4320-a116-c61fd538a561', '6e4d6549-bf6d-4992-9665-39738d2af438', 'bungoma-boda-riders-sacco',
   'Bungoma Boda Riders Sacco', 'Transport sacco', 'Registered boda boda sacco running helmet and speed-limiter compliance drives.', 'Bungoma', 'https://bungomaboda.example.co.ke', '0700 777 888', false),
  ('6050122f-4d39-44e4-bc40-73dc010e1c52', 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e', 'machakos-county-roads-authority',
   'Machakos County Roads Authority', 'Government agency', 'County department responsible for road maintenance, junctions and signage in Machakos.', 'Machakos', 'https://machakos.example.go.ke', '0700 888 999', true),
  ('c7fffb3b-fe27-4709-bd05-4b9c743c4afb', '70053218-2662-4ac6-ae28-154ff497a5ff', 'nyeri-auto-clinic',
   'Nyeri Auto Clinic', 'Garage / mechanic', 'General garage offering brake, tyre and lighting checks for private and PSV vehicles.', 'Nyeri', 'https://nyeriautoclinic.example.co.ke', '0700 999 000', false);

-- ----- 4 more alerts (total 10) -----
INSERT INTO public.alerts (id, user_id, page_id, title, description, county, road, road_id, hazard_type, severity, status, is_anonymous, created_at) VALUES
  ('da27ca45-90ec-47b5-9855-c3807c020ef9', 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e', NULL,
   'Fallen tree blocking a lane on the Southern Bypass', 'Storm brought down a large tree overnight near the Ngong Road interchange, one lane passable.', 'Nairobi', 'Southern Bypass', '08117459-a727-4185-affd-d5c5999c8e73', 'obstruction', 'medium', 'active', false, now() - interval '9 hours'),
  ('5255f48e-def5-4af2-a3aa-077c3710dbe7', '62935ae1-3e1e-4375-98d6-1c05034841d6', NULL,
   'Washed-out section on Garissa Road', 'Flash floods have eroded the road shoulder near Mwingi turn-off, edge is unstable.', 'Machakos', 'Garissa Road', '4428ce0d-01fb-448c-9288-82df47ade767', 'road_damage', 'high', 'active', true, now() - interval '11 hours'),
  ('d92200d2-8ecb-487f-935c-70987b863d00', '6e4d6549-bf6d-4992-9665-39738d2af438', '6d87029c-3035-4320-a116-c61fd538a561',
   'Overloaded truck swerving on Kakamega-Bungoma Road', 'A sugarcane lorry well over its axle limit has been weaving between lanes near Mumias.', 'Bungoma', 'Kakamega-Bungoma Road', 'ec39b16a-f000-4ce1-80d4-3c978f7764cb', 'reckless_driving', 'medium', 'active', false, now() - interval '13 hours'),
  ('8af8b725-5370-4859-9cdf-1f9ffb0f7dcd', '70053218-2662-4ac6-ae28-154ff497a5ff', NULL,
   'Dust storm reducing visibility on Nyeri-Nanyuki Road', 'Strong winds are lifting dust off dry fields, visibility drops sharply in gusts.', 'Nyeri', 'Nyeri-Nanyuki Road', 'fa4ce3e2-b4ed-44b9-a661-457b218d80aa', 'poor_visibility', 'high', 'active', false, now() - interval '15 hours');

-- ----- 4 more accident reports (total 10) -----
INSERT INTO public.accident_reports (id, user_id, page_id, title, description, county, road, road_id, occurred_at, vehicles_involved, casualties, fatalities, severity, status, reviewed_by, reviewed_at, editor_note, rejection_reason) VALUES
  ('99df96e7-f27b-4789-ba0d-362ac3e27754', 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e', NULL,
   'Two cars collide at Southern Bypass junction', 'A right-of-way dispute at an unmarked junction led to a side-impact collision.', 'Nairobi', 'Southern Bypass', '08117459-a727-4185-affd-d5c5999c8e73',
   now() - interval '3 days', 2, 1, 0, 'moderate', 'approved', '188ddc45-4a10-4be7-af8e-a1e96beafaed', now() - interval '2 days', 'Confirmed the junction lacks give-way signage, flagged to KURA.', NULL),
  ('f4045fef-e650-40fb-bdb5-76dbd202730c', '62935ae1-3e1e-4375-98d6-1c05034841d6', NULL,
   'Matatu skids off Garissa Road after eroded shoulder gives way', 'Vehicle slid into a ditch after the road edge collapsed following recent floods.', 'Machakos', 'Garissa Road', '4428ce0d-01fb-448c-9288-82df47ade767',
   now() - interval '5 days', 1, 3, 0, 'serious', 'approved', '0881db0e-737b-42c9-ba1b-1b262f352618', now() - interval '4 days', 'Cross-checked with Red Cross first responder log.', NULL),
  ('a4ea70cd-bb5e-4296-b345-7abd6f102ebb', '6e4d6549-bf6d-4992-9665-39738d2af438', '6d87029c-3035-4320-a116-c61fd538a561',
   'Boda boda collision on Kakamega-Bungoma Road', 'Two riders collided while overtaking a slow-moving lorry near Mumias market.', 'Bungoma', 'Kakamega-Bungoma Road', 'ec39b16a-f000-4ce1-80d4-3c978f7764cb',
   now() - interval '18 hours', 2, 2, 0, 'moderate', 'pending', NULL, NULL, NULL, NULL),
  ('5beb3d67-ff47-43e9-923a-774c22e6fcea', '70053218-2662-4ac6-ae28-154ff497a5ff', NULL,
   'Fatal head-on collision on Nyeri-Nanyuki Road', 'Reduced visibility from a dust storm is suspected in a head-on crash between two saloon cars.', 'Nyeri', 'Nyeri-Nanyuki Road', 'fa4ce3e2-b4ed-44b9-a661-457b218d80aa',
   now() - interval '7 days', 2, 2, 2, 'fatal', 'approved', '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', now() - interval '6 days', 'Verified with county police abstract; visibility flagged as contributing factor.', NULL);

-- ----- 6 more comments (total 12) -----
INSERT INTO public.comments (user_id, entity_type, entity_id, body, created_at) VALUES
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'alert', 'da27ca45-90ec-47b5-9855-c3807c020ef9', 'KURA crews were on site by mid-morning, tree has been cleared.', now() - interval '5 hours'),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'alert', '5255f48e-def5-4af2-a3aa-077c3710dbe7', 'Please avoid the shoulder entirely here, not just slow down.', now() - interval '8 hours'),
  ('7b360ed6-3773-4102-9d65-15adabe66965', 'report', '99df96e7-f27b-4789-ba0d-362ac3e27754', 'This junction has needed give-way signs for months, glad it is finally being looked at.', now() - interval '1 day'),
  ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'report', '5beb3d67-ff47-43e9-923a-774c22e6fcea', 'Terrible news. Dust storms on this stretch need proper warning signage.', now() - interval '5 days'),
  ('6e4d6549-bf6d-4992-9665-39738d2af438', 'alert', '9b351ff0-6219-4de5-9347-72ebaecabcd2', 'We route our sacco riders around Mlolongo entirely during long rains now.', now() - interval '22 hours'),
  ('eb986179-ee3b-453f-bf7e-ff7e7e7b264e', 'news', '4e61342d-0023-47f7-adea-326f7d4ad593', 'Good to see engineering data driving this instead of just enforcement.', now() - interval '2 days');

-- ----- 4 more videos (total 10) -----
INSERT INTO public.videos (user_id, title, description, video_url, status) VALUES
  ('6e4d6549-bf6d-4992-9665-39738d2af438', 'Boda boda sacco safety briefing', 'A weekly safety briefing format saccos can run before shifts start.', 'https://www.youtube.com/watch?v=sb-demo00007', 'featured'),
  ('eb986179-ee3b-453f-bf7e-ff7e7e7b264e', 'How engineers assess a black spot', 'A walkthrough of the survey process behind KeNHA black-spot redesigns.', 'https://www.youtube.com/watch?v=sb-demo00008', 'featured'),
  ('62935ae1-3e1e-4375-98d6-1c05034841d6', 'First aid basics for road crashes', 'What to do, and not do, before an ambulance arrives.', 'https://www.youtube.com/watch?v=sb-demo00009', 'featured'),
  ('70053218-2662-4ac6-ae28-154ff497a5ff', 'Reversing and parking safely', 'Common blind-spot mistakes new drivers make in tight parking.', 'https://www.youtube.com/watch?v=sb-demo00010', 'pending_review');

-- ----- 5 more banner ads (total 10) -----
INSERT INTO public.banner_ads (title, advertiser, link_url, active) VALUES
  ('Ride Safe With Us', 'Boda Boda Safety Association', 'https://bodasafety.example.co.ke', true),
  ('Book Your Roadworthiness Test', 'AA Kenya', 'https://aakenya.example.co.ke', true),
  ('Emergency Response, 24/7', 'Kenya Red Cross', 'https://redcross.example.or.ke', true),
  ('Genuine Parts, Trusted Fit', 'Toyota Kenya Spares', 'https://toyotakenya.example.co.ke/spares', true),
  ('Plan Your Journey, Check Road Status', 'Kenya Roads Board', 'https://krb.example.go.ke', true);

-- ----- 5 more merch items (total 10) -----
INSERT INTO public.merch_items (id, name, description, price_kes, active) VALUES
  ('83cdebdb-4623-47a2-9962-98714ee633cb', 'First Aid Kit (Compact)', 'Glovebox-sized kit with dressings, gloves and a foil blanket.', 1800, true),
  ('81836850-6da6-4298-b625-86fc5f3feb15', 'LED Safety Torch', 'Rechargeable roadside torch with a red hazard-flash mode.', 700, true),
  ('991f3ebf-a3e5-4ee0-acd2-1e8114165583', 'Kids Reflective Backpack Cover', 'Hi-vis rain cover to keep young pedestrians visible at dusk.', 600, true),
  ('2c1f06f9-f3b2-4314-b302-a02c99900f3f', 'Share Barabara Hoodie', 'Fleece-lined hoodie with the Share Barabara logo.', 2500, true),
  ('d3437c59-730d-4ff0-b4d0-fb645e5cc7a9', 'Dashboard Phone Mount', 'Keeps navigation visible without holding the phone while driving.', 1000, true);

-- ----- 5 more subscriptions (total 10; fills in David plus the 4 new users) -----
INSERT INTO public.subscriptions (user_id, active, tier, expires_at) VALUES
  ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8', true, 'profile', now() + interval '7 months'),
  ('6e4d6549-bf6d-4992-9665-39738d2af438', true, 'profile', now() + interval '10 months'),
  ('eb986179-ee3b-453f-bf7e-ff7e7e7b264e', true, 'profile', now() + interval '5 months'),
  ('62935ae1-3e1e-4375-98d6-1c05034841d6', true, 'profile', now() + interval '12 months'),
  ('70053218-2662-4ac6-ae28-154ff497a5ff', true, 'profile', now() + interval '3 months')
ON CONFLICT (user_id) DO NOTHING;

-- ----- 5 more star ratings (total 10) -----
INSERT INTO public.user_ratings (rater_id, rated_user_id, stars) VALUES
  ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8', '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 5),
  ('6e4d6549-bf6d-4992-9665-39738d2af438', 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e', 4),
  ('eb986179-ee3b-453f-bf7e-ff7e7e7b264e', '62935ae1-3e1e-4375-98d6-1c05034841d6', 5),
  ('62935ae1-3e1e-4375-98d6-1c05034841d6', '70053218-2662-4ac6-ae28-154ff497a5ff', 4),
  ('70053218-2662-4ac6-ae28-154ff497a5ff', '6e4d6549-bf6d-4992-9665-39738d2af438', 5)
ON CONFLICT (rater_id, rated_user_id) DO NOTHING;

-- ----- 5 more quote submissions (total 10) -----
INSERT INTO public.quote_submissions (user_id, quote, author, status) VALUES
  ('6e4d6549-bf6d-4992-9665-39738d2af438', 'A trained rider is a rider who comes home.', 'Sarah Wafula', 'approved'),
  ('eb986179-ee3b-453f-bf7e-ff7e7e7b264e', 'Roads should forgive small mistakes, not punish them with lives.', 'James Kariuki', 'pending'),
  ('62935ae1-3e1e-4375-98d6-1c05034841d6', 'The golden hour is not a metaphor, it is a countdown.', 'Fatuma Abdi', 'approved'),
  ('70053218-2662-4ac6-ae28-154ff497a5ff', 'Every lesson starts the same way: mirrors, signal, shoulder check.', 'Michael Otundo', 'pending'),
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'Community reporting is how we find the hazards statistics miss.', 'Wanjiru Kamau', 'approved');

-- ----- 5 more partner enquiries (total 10) -----
INSERT INTO public.partner_enquiries (company, contact_email, goals, budget, status) VALUES
  ('Kenya Red Cross Society', 'partnerships@redcross.example.or.ke', 'Co-host first aid training content and a donation drive.', 'In-kind support', 'contacted'),
  ('CIC Insurance', 'brand@cic.example.co.ke', 'Sponsor the accident report review workflow with a safety tips callout.', 'KES 300,000', 'new'),
  ('Isuzu East Africa', 'marketing@isuzu.example.co.ke', 'Feature commercial vehicle safety videos.', 'KES 400,000', 'new'),
  ('Bungoma County Government', 'roads@bungoma.example.go.ke', 'Promote a boda boda helmet distribution programme.', 'In-kind support', 'new'),
  ('Absa Bank Kenya', 'csr@absa.example.co.ke', 'Sponsor the merch store as part of a road safety CSR campaign.', 'KES 350,000', 'contacted');

-- ----- 5 more merch orders (total 10) -----
INSERT INTO public.merch_orders (item_id, quantity, contact_name, contact_phone, delivery_notes, status) VALUES
  ('83cdebdb-4623-47a2-9962-98714ee633cb', 2, 'Grace Wanjala', '0766 111 222', 'For sacco office, Bungoma.', 'new'),
  ('81836850-6da6-4298-b625-86fc5f3feb15', 4, 'Peter Kamau', '0777 222 333', NULL, 'processing'),
  ('991f3ebf-a3e5-4ee0-acd2-1e8114165583', 10, 'Machakos Primary School PTA', '0788 333 444', 'Bulk order for Class 4 pupils.', 'new'),
  ('2c1f06f9-f3b2-4314-b302-a02c99900f3f', 1, 'Njoki Karanja', '0799 444 555', NULL, 'shipped'),
  ('d3437c59-730d-4ff0-b4d0-fb645e5cc7a9', 3, 'Hassan Yusuf', '0700 555 000', 'Deliver to Garissa Red Cross office.', 'new');

-- ----- 5 more news articles (total 10) -----
INSERT INTO public.news (slug, title, summary, body, category, source, featured, status, published_at, author_id) VALUES
  ('county-road-safety-signage-fund', 'County governments to receive KES 2 billion for road safety signage',
   'A new national fund will help counties install warning signs and speed bumps on high-risk roads.',
   'The National Treasury has allocated KES 2 billion to county governments over the next financial year specifically for road safety infrastructure.' || chr(10) || chr(10) ||
   'Counties will use the funding for warning signage, speed bumps near schools and markets, and pedestrian crossings on roads previously flagged in the black-spot mapping programme.' || chr(10) || chr(10) ||
   'Disbursement will be tied to each county submitting a signed-off black-spot priority list, with the first tranche expected within two months.',
   'Counties', 'Ministry of Roads and Transport', false, 'published', now() - interval '2 days', NULL),
  ('opinion-speed-bumps-are-not-enough', 'Opinion: Why speed bumps alone will not fix our black spots',
   'A civil engineer argues that reactive traffic calming is treating the symptom, not the cause.',
   'Every time there is a fatal crash on a stretch of road, the same request follows: put in a speed bump.' || chr(10) || chr(10) ||
   'Speed bumps have a place, but installed without proper signage, lighting or drainage they often just relocate the danger a few hundred metres down the road.' || chr(10) || chr(10) ||
   'What we need is a proper junction and corridor design process, the kind already used on the black-spot mapping programme, applied to the roads communities are asking to have bumps installed on.',
   'Opinion', 'James Kariuki, guest columnist', false, 'published', now() - interval '4 days', 'eb986179-ee3b-453f-bf7e-ff7e7e7b264e'),
  ('history-killer-road-nickname', 'History: How the Nairobi-Nakuru highway earned the name "Killer road"',
   'A look back at decades of crashes that shaped the highway''s grim nickname, and what has changed since.',
   'Long before dual-carriageway works began, the Nairobi-Nakuru highway was known informally as the "killer road", a nickname earned over decades of head-on collisions on its narrow, undivided sections.' || chr(10) || chr(10) ||
   'Steep escarpment sections, mixed traffic of matatus, trucks and private cars, and limited overtaking lanes combined to make it one of the deadliest corridors in the country through the 1990s and 2000s.' || chr(10) || chr(10) ||
   'Recent dualling works and median barriers on several sections have reduced head-on collisions significantly, though enforcement gaps remain on stretches still awaiting upgrade.',
   'History', 'Share Barabara Desk', false, 'published', now() - interval '6 days', NULL),
  ('thika-superhighway-footbridge-opens', 'New pedestrian footbridge opens on Thika Superhighway',
   'A footbridge near Githurai aims to reduce pedestrian crossings of the busy highway on foot.',
   'KeNHA has opened a new pedestrian footbridge on Thika Superhighway near Githurai, a stretch that has recorded repeated pedestrian fatalities.' || chr(10) || chr(10) ||
   'The footbridge includes ramps for wheelchair access and is lit for night-time use, addressing a long-standing community request following several reported hazards in the area.' || chr(10) || chr(10) ||
   'KeNHA says two more footbridges are planned for other high-pedestrian-traffic sections of the highway before the end of the year.',
   'Infrastructure', 'KeNHA', false, 'published', now() - interval '1 day', NULL),
  ('victims-focus-hit-and-run-survivor-account', 'Submitted: A boda boda rider''s account of surviving a hit-and-run',
   'A first-person submission describing recovery after a hit-and-run, submitted for editorial review.',
   'I was riding home just after dark when a car overtook another vehicle on a blind bend and hit me head-on before speeding off.' || chr(10) || chr(10) ||
   'A matatu conductor and two boda boda riders stopped to help before an ambulance arrived. I spent three weeks in hospital and still cannot grip the throttle fully with my right hand.' || chr(10) || chr(10) ||
   'I am sharing this so other riders know: note the registration if you can, but do not chase. Get to safety and call for help first.',
   'Victims Focus', NULL, false, 'pending_review', now(), '62935ae1-3e1e-4375-98d6-1c05034841d6');

-- ----- a handful more votes on the new alerts/reports -----
INSERT INTO public.votes (user_id, entity_type, entity_id, value) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'alert', 'da27ca45-90ec-47b5-9855-c3807c020ef9', 1),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'alert', '5255f48e-def5-4af2-a3aa-077c3710dbe7', 1),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'alert', 'd92200d2-8ecb-487f-935c-70987b863d00', 1),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'report', '99df96e7-f27b-4789-ba0d-362ac3e27754', 1),
  ('7b360ed6-3773-4102-9d65-15adabe66965', 'report', 'f4045fef-e650-40fb-bdb5-76dbd202730c', 1),
  ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'report', 'a4ea70cd-bb5e-4296-b345-7abd6f102ebb', 1);
