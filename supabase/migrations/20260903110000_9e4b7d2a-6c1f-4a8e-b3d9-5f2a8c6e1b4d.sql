-- Five independently-pinnable slots powering the homepage Pages preview: each
-- resolves to an admin pin or a random verified (subscribed) page, mirroring
-- the existing home_page/pages_of_day pattern but as a list instead of one.
INSERT INTO public.featured_picks (slot) VALUES
  ('home_pages_1'), ('home_pages_2'), ('home_pages_3'), ('home_pages_4'), ('home_pages_5')
ON CONFLICT (slot) DO NOTHING;
