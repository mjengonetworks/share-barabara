-- ===== ADMIN-MANAGEABLE TAXONOMIES =====
-- News categories, hazard types and severities were hardcoded TS constants.
-- These tables drive the picker options in forms/filters/admin; the columns
-- that actually store a category/hazard/severity on news/alerts/accident_reports
-- stay plain TEXT (as they always were, no FK) so removing an option here
-- never breaks existing rows already using it.

CREATE TABLE public.news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hazard_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alert_severities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.report_severities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.news_categories (name, sort_order) VALUES
  ('News', 1), ('Alerts', 2), ('Awareness', 3), ('Enforcement', 4), ('Policy', 5),
  ('History', 6), ('Engineering', 7), ('Opinion', 8), ('Victims Focus', 9),
  ('Infrastructure', 10), ('Counties', 11), ('Partner Content', 12);

INSERT INTO public.hazard_types (value, label, sort_order) VALUES
  ('crash', 'Crash / collision', 1),
  ('road_damage', 'Potholes or road damage', 2),
  ('flooding', 'Flooding', 3),
  ('obstruction', 'Obstruction or stalled vehicle', 4),
  ('poor_visibility', 'Fog or poor visibility', 5),
  ('reckless_driving', 'Reckless driving', 6),
  ('roadworks', 'Roadworks', 7),
  ('other', 'Other hazard', 8);

INSERT INTO public.alert_severities (value, label, sort_order) VALUES
  ('low', 'Low', 1), ('medium', 'Medium', 2), ('high', 'High', 3), ('critical', 'Critical', 4);

INSERT INTO public.report_severities (value, label, sort_order) VALUES
  ('minor', 'Minor', 1), ('moderate', 'Moderate', 2), ('serious', 'Serious', 3), ('fatal', 'Fatal', 4);

GRANT SELECT ON public.news_categories, public.hazard_types, public.alert_severities, public.report_severities TO anon, authenticated;
GRANT ALL ON public.news_categories, public.hazard_types, public.alert_severities, public.report_severities TO service_role;

ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hazard_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_severities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_severities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_categories_read" ON public.news_categories FOR SELECT USING (true);
CREATE POLICY "news_categories_write" ON public.news_categories FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

CREATE POLICY "hazard_types_read" ON public.hazard_types FOR SELECT USING (true);
CREATE POLICY "hazard_types_write" ON public.hazard_types FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

CREATE POLICY "alert_severities_read" ON public.alert_severities FOR SELECT USING (true);
CREATE POLICY "alert_severities_write" ON public.alert_severities FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

CREATE POLICY "report_severities_read" ON public.report_severities FOR SELECT USING (true);
CREATE POLICY "report_severities_write" ON public.report_severities FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
