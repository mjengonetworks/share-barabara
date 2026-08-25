-- ===== PLACEHOLDER / DEMO CONTENT =====
-- Seeds at least 5 rows into every table that was still empty after the
-- schema migrations, so the freshly-migrated project isn't blank. Demo
-- accounts share the password 'Barabara2026!' (email/password sign-in) so
-- they can be used for manual QA, not just displayed as read-only bylines.

-- ----- 6 demo auth users (profiles/user_roles are auto-created by the
-- handle_new_user trigger; we enrich profiles and add extra roles after) -----
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000000', '188ddc45-4a10-4be7-af8e-a1e96beafaed', 'authenticated', 'authenticated',
   'wanjiru.kamau@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Wanjiru Kamau"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0881db0e-737b-42c9-ba1b-1b262f352618', 'authenticated', 'authenticated',
   'otieno.ochieng@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Otieno Ochieng"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'authenticated', 'authenticated',
   'amina.hassan@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Amina Hassan"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '7b360ed6-3773-4102-9d65-15adabe66965', 'authenticated', 'authenticated',
   'peter.mwangi@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Peter Mwangi"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'authenticated', 'authenticated',
   'grace.njeri@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"Grace Njeri"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'authenticated', 'authenticated',
   'david.kiptoo@sharebarabara.test', extensions.crypt('Barabara2026!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"David Kiptoo"}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) VALUES
  (gen_random_uuid(), '188ddc45-4a10-4be7-af8e-a1e96beafaed', '188ddc45-4a10-4be7-af8e-a1e96beafaed',
   '{"sub":"188ddc45-4a10-4be7-af8e-a1e96beafaed","email":"wanjiru.kamau@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), '0881db0e-737b-42c9-ba1b-1b262f352618', '0881db0e-737b-42c9-ba1b-1b262f352618',
   '{"sub":"0881db0e-737b-42c9-ba1b-1b262f352618","email":"otieno.ochieng@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2',
   '{"sub":"75549fcf-6556-4bcf-b1ba-433cf4f2fbb2","email":"amina.hassan@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), '7b360ed6-3773-4102-9d65-15adabe66965', '7b360ed6-3773-4102-9d65-15adabe66965',
   '{"sub":"7b360ed6-3773-4102-9d65-15adabe66965","email":"peter.mwangi@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6',
   '{"sub":"d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6","email":"grace.njeri@sharebarabara.test","email_verified":true}', 'email', now(), now()),
  (gen_random_uuid(), 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8',
   '{"sub":"e2df1cd1-c1b9-49f3-a463-52540a65f6b8","email":"david.kiptoo@sharebarabara.test","email_verified":true}', 'email', now(), now());

-- Extra roles on top of the 'member' row the trigger already created.
INSERT INTO public.user_roles (user_id, role) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'admin'),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'editor'),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'moderator')
ON CONFLICT DO NOTHING;

UPDATE public.profiles SET county = 'Nairobi', occupation = 'NTSA volunteer marshal',
  bio = 'Coordinating community road-safety patrols across Nairobi for the last six years.',
  road_safety_message = 'Slow down at the last kilometre, not just the first.'
  WHERE id = '188ddc45-4a10-4be7-af8e-a1e96beafaed';
UPDATE public.profiles SET county = 'Kisumu', occupation = 'Transport journalist',
  bio = 'Covering road safety, transport policy and infrastructure for a regional newsroom.',
  road_safety_message = 'A good headline never justified a bad overtake.'
  WHERE id = '0881db0e-737b-42c9-ba1b-1b262f352618';
UPDATE public.profiles SET county = 'Mombasa', occupation = 'Traffic police liaison officer',
  bio = 'Working with NTSA and county police to reduce night-time PSV crashes on the coast.',
  road_safety_message = 'Every checkpoint exists because someone did not make it home.'
  WHERE id = '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2';
UPDATE public.profiles SET county = 'Nakuru', occupation = 'Matatu driver',
  bio = 'Fifteen years driving the Nakuru-Nairobi route, now training newer drivers on defensive driving.',
  road_safety_message = 'Your passengers are trusting you with their whole day. Do not rush it.'
  WHERE id = '7b360ed6-3773-4102-9d65-15adabe66965';
UPDATE public.profiles SET county = 'Kiambu', occupation = 'Boda boda rider',
  bio = 'Rides deliveries around Kiambu and Thika, helmet-on advocate in the local riders sacco.',
  road_safety_message = 'A helmet is cheaper than a hospital bed.'
  WHERE id = 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6';
UPDATE public.profiles SET county = 'Uasin Gishu', occupation = 'Long-haul truck driver',
  bio = 'Runs the Eldoret-Malaba-Mombasa corridor, reports hazards on every trip.',
  road_safety_message = 'Fatigue kills quieter than speed, but just as dead.'
  WHERE id = 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8';

INSERT INTO public.notification_preferences (user_id) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed'), ('0881db0e-737b-42c9-ba1b-1b262f352618'),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2'), ('7b360ed6-3773-4102-9d65-15adabe66965'),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6'), ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8')
ON CONFLICT DO NOTHING;

-- ----- 6 roads -----
INSERT INTO public.roads (id, name, slug, county, road_class, authority, surface) VALUES
  ('b9d34a4b-1218-4219-831f-d95c87aabf65', 'Thika Superhighway', 'thika-superhighway', 'Kiambu', 'Class A', 'KeNHA', 'Tarmac'),
  ('33912a7d-5172-4f76-8b93-503fc21826d0', 'Mombasa Road', 'mombasa-road', 'Nairobi', 'Class A', 'KeNHA', 'Tarmac'),
  ('f3ace315-82d0-4775-81ed-522157b4da9f', 'Waiyaki Way', 'waiyaki-way', 'Nairobi', 'Urban', 'KURA', 'Tarmac'),
  ('6ad3ad1c-a2c5-482a-a073-5439dcc8a1e6', 'Nairobi-Nakuru Highway', 'nairobi-nakuru-highway', 'Nakuru', 'Class A', 'KeNHA', 'Tarmac'),
  ('6fd87f5c-a362-476b-8ae9-e62ce5a545c5', 'Kisumu-Kakamega Road', 'kisumu-kakamega-road', 'Kisumu', 'Class B', 'KeNHA', 'Tarmac'),
  ('c564414c-c390-4c73-a393-cc4b10c23eda', 'Eldoret-Malaba Road', 'eldoret-malaba-road', 'Uasin Gishu', 'Class A', 'KeNHA', 'Tarmac');

-- ----- 6 pages, spanning road safety and construction -----
INSERT INTO public.pages (id, owner_id, slug, name, category, description, county, website_url, phone, verified) VALUES
  ('6d6b5ee7-22b2-40f7-95e5-6147fd777cb8', '188ddc45-4a10-4be7-af8e-a1e96beafaed', 'safedrive-kenya',
   'SafeDrive Kenya', 'NGO / advocacy', 'Community road-safety advocacy group running driver awareness clinics across Nairobi.', 'Nairobi', 'https://safedrivekenya.example.org', '0700 111 222', true),
  ('b2a53e0e-9d4a-443e-8e07-d83a73e59e60', '0881db0e-737b-42c9-ba1b-1b262f352618', 'nairobi-driving-academy',
   'Nairobi Driving Academy', 'Driving school', 'Certified driving instruction and defensive driving refresher courses.', 'Nairobi', 'https://nairobidrivingacademy.example.co.ke', '0700 222 333', false),
  ('8bd0bb6d-a0d5-4b0c-8a2b-1ed29ed0f0ba', '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'jenga-construction-ltd',
   'Jenga Construction Ltd', 'Construction company', 'Road and bridge construction contractor, partners with KeNHA on black-spot remediation.', 'Mombasa', 'https://jengaconstruction.example.co.ke', '0700 333 444', true),
  ('af15a612-1816-4b88-807a-7f8e61724fe9', '7b360ed6-3773-4102-9d65-15adabe66965', 'kaka-motors-garage',
   'Kaka Motors Garage', 'Garage / mechanic', 'Full-service garage specialising in PSV roadworthiness inspections.', 'Nakuru', 'https://kakamotors.example.co.ke', '0700 444 555', false),
  ('722ab857-7bc1-44b8-b8b1-e10faab928f7', 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'pioneer-sacco',
   'Pioneer Sacco', 'Transport sacco', 'Matatu and boda boda sacco enforcing helmet and speed-limiter compliance among members.', 'Kiambu', 'https://pioneersacco.example.co.ke', '0700 555 666', true),
  ('775eb801-4913-487f-8c5d-0cad19044945', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'rift-valley-hardware',
   'Rift Valley Hardware', 'Hardware store', 'Supplies reflective signage, road paint and safety barriers to county governments.', 'Uasin Gishu', 'https://riftvalleyhardware.example.co.ke', '0700 666 777', false);

-- ----- 6 alerts -----
INSERT INTO public.alerts (id, user_id, page_id, title, description, county, road, road_id, hazard_type, severity, status, is_anonymous, created_at) VALUES
  ('023e890b-8fa1-4745-944a-c37983a49802', '7b360ed6-3773-4102-9d65-15adabe66965', NULL,
   'Deep potholes near Githurai on Thika Superhighway', 'Inside lane heading into town has three deep potholes, hard to see after dark.', 'Kiambu', 'Thika Superhighway', 'b9d34a4b-1218-4219-831f-d95c87aabf65', 'road_damage', 'medium', 'active', false, now() - interval '6 hours'),
  ('9b351ff0-6219-4de5-9347-72ebaecabcd2', 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', NULL,
   'Flooding at Mlolongo on Mombasa Road', 'Standing water covering both lanes after heavy rain, matatus stalling.', 'Nairobi', 'Mombasa Road', '33912a7d-5172-4f76-8b93-503fc21826d0', 'flooding', 'high', 'active', false, now() - interval '1 day'),
  ('eb680e26-02f3-41ec-a8be-6d7579d269f1', '188ddc45-4a10-4be7-af8e-a1e96beafaed', '6d6b5ee7-22b2-40f7-95e5-6147fd777cb8',
   'Matatu overturned on Waiyaki Way', 'Lane blocked near Westlands roundabout, traffic backed up. Emergency services on scene.', 'Nairobi', 'Waiyaki Way', 'f3ace315-82d0-4775-81ed-522157b4da9f', 'crash', 'critical', 'active', false, now() - interval '2 days'),
  ('66a2090f-a817-4f1d-b060-3ef3718fb4ee', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', NULL,
   'Thick fog near Naivasha on the Nakuru highway', 'Visibility under 30 metres before sunrise, several near-misses reported.', 'Nakuru', 'Nairobi-Nakuru Highway', '6ad3ad1c-a2c5-482a-a073-5439dcc8a1e6', 'poor_visibility', 'high', 'active', true, now() - interval '3 days'),
  ('18dcdc68-bf11-4d97-a27b-b8423e9a92c5', '0881db0e-737b-42c9-ba1b-1b262f352618', NULL,
   'Reckless overtaking on Kisumu-Kakamega Road', 'A private car overtaking on the blind rise near Kefinco almost caused a head-on collision.', 'Kisumu', 'Kisumu-Kakamega Road', '6fd87f5c-a362-476b-8ae9-e62ce5a545c5', 'reckless_driving', 'medium', 'active', false, now() - interval '4 days'),
  ('485991b6-9c6d-41e8-bbbc-b220e6d8102c', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', '775eb801-4913-487f-8c5d-0cad19044945',
   'Roadworks obstruction on Eldoret-Malaba Road', 'Single-lane traffic control near Turbo with no warning signage at night.', 'Uasin Gishu', 'Eldoret-Malaba Road', 'c564414c-c390-4c73-a393-cc4b10c23eda', 'roadworks', 'medium', 'active', false, now() - interval '5 days');

-- ----- 6 accident reports, mixed review states -----
INSERT INTO public.accident_reports (id, user_id, page_id, title, description, county, road, road_id, occurred_at, vehicles_involved, casualties, fatalities, severity, status, reviewed_by, reviewed_at, editor_note, rejection_reason) VALUES
  ('8a40ca59-f0dc-493f-8fba-5fb1d2846bcc', '7b360ed6-3773-4102-9d65-15adabe66965', NULL,
   'Two-vehicle collision on Thika Superhighway', 'Private car rear-ended a stationary lorry in slow traffic near Kasarani.', 'Kiambu', 'Thika Superhighway', 'b9d34a4b-1218-4219-831f-d95c87aabf65',
   now() - interval '2 days', 2, 1, 0, 'moderate', 'approved', '188ddc45-4a10-4be7-af8e-a1e96beafaed', now() - interval '1 day', 'Confirmed with traffic police report, minor injuries only.', NULL),
  ('39e81e90-9767-4f0e-a215-7b7c6fb0e794', 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', NULL,
   'Boda boda rider hit by matatu on Waiyaki Way', 'Rider crossing at an unmarked point was struck; taken to Aga Khan hospital.', 'Nairobi', 'Waiyaki Way', 'f3ace315-82d0-4775-81ed-522157b4da9f',
   now() - interval '4 days', 2, 1, 0, 'serious', 'approved', '0881db0e-737b-42c9-ba1b-1b262f352618', now() - interval '3 days', 'Edited for clarity, rider is in stable condition.', NULL),
  ('a3ffef50-cac3-42cd-a6fd-cf08049b035a', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', NULL,
   'Truck rollover on Mombasa Road', 'Articulated lorry rolled while overtaking on the Athi River bend, cargo spilled across both lanes.', 'Nairobi', 'Mombasa Road', '33912a7d-5172-4f76-8b93-503fc21826d0',
   now() - interval '6 days', 1, 2, 1, 'fatal', 'approved', '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', now() - interval '5 days', 'Verified against KeNHA incident log.', NULL),
  ('f8fc7aa4-b07d-4f7d-b983-7fb3f9667814', '0881db0e-737b-42c9-ba1b-1b262f352618', NULL,
   'Matatu rear-ended on the Nakuru highway', 'Sudden braking near Gilgil caused a three-vehicle pile-up, awaiting police abstract.', 'Nakuru', 'Nairobi-Nakuru Highway', '6ad3ad1c-a2c5-482a-a073-5439dcc8a1e6',
   now() - interval '12 hours', 3, 4, 0, 'moderate', 'pending', NULL, NULL, NULL, NULL),
  ('59024656-293f-46f4-9a4f-8101a09e7f59', '188ddc45-4a10-4be7-af8e-a1e96beafaed', NULL,
   'Pedestrian struck on Kisumu-Kakamega Road', 'A schoolchild was struck crossing near a market with no footbridge.', 'Kisumu', 'Kisumu-Kakamega Road', '6fd87f5c-a362-476b-8ae9-e62ce5a545c5',
   now() - interval '8 days', 1, 1, 0, 'serious', 'approved', '75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', now() - interval '7 days', 'Escalated to county roads office for a footbridge request.', NULL),
  ('dc2360a1-d3dd-4d07-85bd-6e9bd8653b3e', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', NULL,
   'Multi-vehicle pile-up near Eldoret', 'Report duplicated an existing entry filed the same afternoon.', 'Uasin Gishu', 'Eldoret-Malaba Road', 'c564414c-c390-4c73-a393-cc4b10c23eda',
   now() - interval '10 days', 4, 3, 1, 'fatal', 'rejected', '188ddc45-4a10-4be7-af8e-a1e96beafaed', now() - interval '9 days', NULL, 'Duplicate of an already-approved report for the same crash.');

-- ----- comments across alerts, reports and news -----
INSERT INTO public.comments (user_id, entity_type, entity_id, body, created_at) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'alert', '023e890b-8fa1-4745-944a-c37983a49802', 'Reported this to KeNHA yesterday, they say a patch crew is scheduled for next week.', now() - interval '5 hours'),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'alert', '9b351ff0-6219-4de5-9347-72ebaecabcd2', 'Same spot floods every long rains. County needs to fix the drainage, not just the road.', now() - interval '20 hours'),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'report', '8a40ca59-f0dc-493f-8fba-5fb1d2846bcc', 'Glad it was only minor injuries. Please always keep your following distance in stop-start traffic.', now() - interval '20 hours'),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'report', '39e81e90-9767-4f0e-a215-7b7c6fb0e794', 'As a rider myself this is exactly why we need marked crossing points on Waiyaki Way.', now() - interval '2 days'),
  ('7b360ed6-3773-4102-9d65-15adabe66965', 'news', 'afa1b1dc-5e6a-416e-87a4-5ebea2a1fcbe', 'Good, night speeding on this stretch has been out of control for months.', now() - interval '1 day'),
  ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'news', 'cb739433-19d9-47bf-9b10-da78cf6715e1', 'Reflective jackets should be mandatory for all riders, not just pillion passengers.', now() - interval '3 days');

-- ----- 6 videos, mostly featured -----
INSERT INTO public.videos (user_id, title, description, video_url, status) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'Defensive driving basics for Kenyan roads', 'A five-minute primer on following distance, mirror checks and hazard scanning.', 'https://www.youtube.com/watch?v=sb-demo00001', 'featured'),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'What to do at a crash scene', 'Step-by-step first response before emergency services arrive.', 'https://www.youtube.com/watch?v=sb-demo00002', 'featured'),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'Helmet fitting for boda boda riders', 'How to properly fit and fasten a KEBS-certified helmet.', 'https://www.youtube.com/watch?v=sb-demo00003', 'featured'),
  ('7b360ed6-3773-4102-9d65-15adabe66965', 'Matatu passenger safety checklist', 'What to check before boarding any public service vehicle.', 'https://www.youtube.com/watch?v=sb-demo00004', 'featured'),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'Night riding visibility tips', 'Reflective gear, lighting and lane positioning after dark.', 'https://www.youtube.com/watch?v=sb-demo00005', 'featured'),
  ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'Long-haul fatigue management', 'A submitted clip awaiting editorial review.', 'https://www.youtube.com/watch?v=sb-demo00006', 'pending_review');

-- ----- 5 banner ads -----
INSERT INTO public.banner_ads (title, advertiser, link_url, active) VALUES
  ('Road Safety Starts With You', 'NTSA', 'https://ntsa.example.go.ke', true),
  ('Drive Safe, Arrive Alive', 'Toyota Kenya', 'https://toyotakenya.example.co.ke', true),
  ('Comprehensive Motor Cover', 'AAR Insurance', 'https://aarinsurance.example.co.ke', true),
  ('Tyres That Grip When It Matters', 'Bridgestone Kenya', 'https://bridgestone.example.co.ke', true),
  ('Fuel Up Safely, Every Stop', 'TotalEnergies', 'https://totalenergies.example.co.ke', true);

-- ----- 5 merch items -----
INSERT INTO public.merch_items (id, name, description, price_kes, active) VALUES
  ('772ecbe4-2871-4b1f-84e7-587ce1ae14fe', 'Share Barabara Reflective Vest', 'High-visibility vest with reflective strips, one size fits most.', 1500, true),
  ('2dc55fbb-0b33-41af-a338-ae8e00004e99', 'Share Barabara T-Shirt', 'Cotton tee with the Share Barabara logo.', 1200, true),
  ('dfc1c2e2-5a09-4f77-a202-e0806d755c7f', 'Car Sticker Pack', 'Set of 3 reflective bumper stickers.', 500, true),
  ('787cdfa0-d5f2-4d34-8591-c02ecce0c229', 'Branded Cap', 'Adjustable cap with embroidered logo.', 800, true),
  ('a7eefc9e-6c8b-4be1-8142-1e6ef314ad51', 'Emergency Window Breaker & Seatbelt Cutter', 'Compact glovebox tool for crash emergencies.', 900, true);

-- ----- 5 active subscriptions -----
INSERT INTO public.subscriptions (user_id, active, tier, expires_at) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', true, 'profile', now() + interval '10 months'),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', true, 'profile', now() + interval '8 months'),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', true, 'profile', now() + interval '6 months'),
  ('7b360ed6-3773-4102-9d65-15adabe66965', true, 'profile', now() + interval '9 months'),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', true, 'profile', now() + interval '11 months');

-- ----- 5 star ratings between subscribers -----
INSERT INTO public.user_ratings (rater_id, rated_user_id, stars) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', '7b360ed6-3773-4102-9d65-15adabe66965', 5),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'd3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 4),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 5),
  ('7b360ed6-3773-4102-9d65-15adabe66965', '188ddc45-4a10-4be7-af8e-a1e96beafaed', 5),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', '0881db0e-737b-42c9-ba1b-1b262f352618', 4);

-- ----- 5 quote submissions -----
INSERT INTO public.quote_submissions (user_id, quote, author, status) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'The road is not a race track, it is a shared space.', 'Wanjiru Kamau', 'pending'),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'Patience costs minutes. Impatience costs lives.', 'Otieno Ochieng', 'pending'),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'A seatbelt takes two seconds. A funeral takes a lifetime.', 'Amina Hassan', 'approved'),
  ('7b360ed6-3773-4102-9d65-15adabe66965', 'Drive like everyone you love is on the road ahead of you.', 'Peter Mwangi', 'pending'),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'Helmets are not optional, they are the difference.', 'Grace Njeri', 'approved');

-- ----- 5 notifications -----
INSERT INTO public.notifications (user_id, type, title, body, read_at) VALUES
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'upvote', 'Someone upvoted your alert', 'Matatu overturned on Waiyaki Way', NULL),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'article_status', 'Your article was published', 'Boda boda helmet rules tightened', now() - interval '1 day'),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'report_status', 'Your accident report was approved', 'Pedestrian struck on Kisumu-Kakamega Road', now() - interval '2 days'),
  ('7b360ed6-3773-4102-9d65-15adabe66965', 'comment_reply', 'Someone replied to your comment', 'Same spot floods every long rains...', NULL),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'nearby_alert', 'New hazard alert near you', 'Deep potholes near Githurai on Thika Superhighway', NULL);

-- ----- 5 partner enquiries (guest submissions, matching real usage) -----
INSERT INTO public.partner_enquiries (company, contact_email, goals, budget, status) VALUES
  ('SafeRide Insurance', 'partnerships@saferide.example.co.ke', 'Sponsor banner ads targeting boda boda riders.', 'KES 200,000 / month', 'new'),
  ('Continental Tyres EA', 'marketing@continental.example.co.ke', 'Co-brand a road safety video series.', 'KES 500,000', 'new'),
  ('County Government of Kiambu', 'roads@kiambu.example.go.ke', 'Promote a black-spot reporting drive to residents.', 'In-kind support', 'contacted'),
  ('Jubilee Insurance', 'brand@jubilee.example.co.ke', 'Feature on the Pages directory as a verified insurer.', 'KES 150,000', 'new'),
  ('Ma3Route', 'hello@ma3route.example.co.ke', 'Cross-promote live traffic alerts.', 'Barter / cross-promotion', 'new');

-- ----- 5 merch orders -----
INSERT INTO public.merch_orders (item_id, quantity, contact_name, contact_phone, delivery_notes, status) VALUES
  ('772ecbe4-2871-4b1f-84e7-587ce1ae14fe', 2, 'Susan Wambui', '0711 222 333', 'Deliver to Westlands office.', 'new'),
  ('2dc55fbb-0b33-41af-a338-ae8e00004e99', 1, 'James Otieno', '0722 333 444', NULL, 'new'),
  ('dfc1c2e2-5a09-4f77-a202-e0806d755c7f', 5, 'Fatuma Ali', '0733 444 555', 'For sacco members, bulk pickup.', 'processing'),
  ('787cdfa0-d5f2-4d34-8591-c02ecce0c229', 3, 'Brian Kiplagat', '0744 555 666', NULL, 'new'),
  ('a7eefc9e-6c8b-4be1-8142-1e6ef314ad51', 1, 'Mercy Chebet', '0755 666 777', 'Gift wrap if possible.', 'shipped');
