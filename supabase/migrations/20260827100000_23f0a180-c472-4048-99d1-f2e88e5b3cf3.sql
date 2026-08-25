-- ===== PAGE CATEGORIES (admin-editable) =====
-- pages.category stays free-form TEXT (matches the news.category pattern) so
-- renaming/removing a category here never breaks an existing page's row.
CREATE TABLE public.page_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.page_categories TO anon, authenticated;
GRANT ALL ON public.page_categories TO service_role;
ALTER TABLE public.page_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_categories_public_read" ON public.page_categories FOR SELECT USING (true);
CREATE POLICY "page_categories_admin_insert" ON public.page_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "page_categories_admin_update" ON public.page_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "page_categories_admin_delete" ON public.page_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Spans both road safety and construction, since Pages are open to any
-- organisation in either industry (e.g. a driving school or a paint brand).
INSERT INTO public.page_categories (name, sort_order) VALUES
  ('Driving school', 1),
  ('Garage / mechanic', 2),
  ('Insurance', 3),
  ('Transport sacco', 4),
  ('Logistics & haulage', 5),
  ('Construction company', 6),
  ('Building materials supplier', 7),
  ('Architecture & engineering', 8),
  ('Real estate developer', 9),
  ('Hardware store', 10),
  ('Government agency', 11),
  ('NGO / advocacy', 12),
  ('Media', 13),
  ('Other', 14)
ON CONFLICT (name) DO NOTHING;

-- Two more featured_picks slots for the Pages directory ("of the day" / "of
-- the week"). Random fallback for these only draws from verified (premium
-- subscribed) pages, same rule as the home/campaigns featured page slots.
INSERT INTO public.featured_picks (slot) VALUES ('pages_of_day'), ('pages_of_week')
ON CONFLICT (slot) DO NOTHING;
