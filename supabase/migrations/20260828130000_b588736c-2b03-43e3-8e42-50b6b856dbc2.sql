-- ===== PLACEHOLDER VOTES + NEWS VIEWS =====
-- Interaction logs so vote counts and the "Trending" news section aren't
-- empty either.
INSERT INTO public.votes (user_id, entity_type, entity_id, value) VALUES
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'alert', '023e890b-8fa1-4745-944a-c37983a49802', 1),
  ('75549fcf-6556-4bcf-b1ba-433cf4f2fbb2', 'alert', '023e890b-8fa1-4745-944a-c37983a49802', 1),
  ('7b360ed6-3773-4102-9d65-15adabe66965', 'alert', '9b351ff0-6219-4de5-9347-72ebaecabcd2', 1),
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'alert', 'eb680e26-02f3-41ec-a8be-6d7579d269f1', 1),
  ('d3ead25e-14e8-4165-a4bd-fbeaa5f9ffc6', 'alert', 'eb680e26-02f3-41ec-a8be-6d7579d269f1', 1),
  ('e2df1cd1-c1b9-49f3-a463-52540a65f6b8', 'report', '8a40ca59-f0dc-493f-8fba-5fb1d2846bcc', 1),
  ('0881db0e-737b-42c9-ba1b-1b262f352618', 'report', '39e81e90-9767-4f0e-a215-7b7c6fb0e794', 1),
  ('188ddc45-4a10-4be7-af8e-a1e96beafaed', 'report', '59024656-293f-46f4-9a4f-8101a09e7f59', 1);

INSERT INTO public.news_views (news_id, created_at) VALUES
  ('afa1b1dc-5e6a-416e-87a4-5ebea2a1fcbe', now() - interval '1 hour'),
  ('afa1b1dc-5e6a-416e-87a4-5ebea2a1fcbe', now() - interval '2 hours'),
  ('afa1b1dc-5e6a-416e-87a4-5ebea2a1fcbe', now() - interval '3 hours'),
  ('afa1b1dc-5e6a-416e-87a4-5ebea2a1fcbe', now() - interval '4 hours'),
  ('afa1b1dc-5e6a-416e-87a4-5ebea2a1fcbe', now() - interval '5 hours'),
  ('afa1b1dc-5e6a-416e-87a4-5ebea2a1fcbe', now() - interval '6 hours'),
  ('cb739433-19d9-47bf-9b10-da78cf6715e1', now() - interval '2 hours'),
  ('cb739433-19d9-47bf-9b10-da78cf6715e1', now() - interval '3 hours'),
  ('cb739433-19d9-47bf-9b10-da78cf6715e1', now() - interval '5 hours'),
  ('4e61342d-0023-47f7-adea-326f7d4ad593', now() - interval '4 hours'),
  ('4e61342d-0023-47f7-adea-326f7d4ad593', now() - interval '7 hours');
