-- Task 43 — Theft, Vandalism & Content Taxonomy (REVIEW ONLY)
-- Do not execute until the taxonomy, form compatibility and RLS plan are approved.
-- Existing content values are deliberately not rewritten or backfilled.

-- Alert hazard_type remains the stable stored value. parent_value lets the
-- existing hazard taxonomy express a family/subtype relationship without
-- introducing a second alert classification column.
ALTER TABLE public.hazard_types
  ADD COLUMN IF NOT EXISTS parent_value TEXT;

ALTER TABLE public.hazard_types
  DROP CONSTRAINT IF EXISTS hazard_types_parent_not_self;
ALTER TABLE public.hazard_types
  ADD CONSTRAINT hazard_types_parent_not_self
  CHECK (parent_value IS NULL OR parent_value <> value);

CREATE INDEX IF NOT EXISTS hazard_types_parent_value_idx
  ON public.hazard_types (parent_value, sort_order);

-- Articles retain their existing category/categories storage. The optional
-- parent_name is descriptive taxonomy metadata; article rows remain plain text
-- for historical and URL compatibility.
ALTER TABLE public.news_categories
  ADD COLUMN IF NOT EXISTS parent_name TEXT;

CREATE INDEX IF NOT EXISTS news_categories_parent_name_idx
  ON public.news_categories (parent_name, sort_order);

-- Reports keep severity independent from incident classification. NULL means
-- the report has no supported incident classification, not "other".
ALTER TABLE public.accident_reports
  ADD COLUMN IF NOT EXISTS incident_type TEXT;

CREATE INDEX IF NOT EXISTS accident_reports_incident_type_idx
  ON public.accident_reports (incident_type, occurred_at DESC);

-- Stable alert/report incident values. Parent rows remain selectable when
-- evidence supports only the family; subtypes are optional.
INSERT INTO public.hazard_types (value, label, parent_value, sort_order)
VALUES
  ('theft', 'Theft', NULL, 20),
  ('vehicle_theft', 'Vehicle theft', 'theft', 21),
  ('motorcycle_theft', 'Motorcycle theft', 'theft', 22),
  ('road_furniture_theft', 'Road furniture theft', 'theft', 23),
  ('vandalism', 'Vandalism', NULL, 24),
  ('road_furniture_vandalism', 'Road furniture vandalism', 'vandalism', 25)
ON CONFLICT (value) DO NOTHING;

-- The same stable labels can be selected as Article categories. Existing
-- articles are untouched and no category is inferred from their text.
INSERT INTO public.news_categories (name, label, parent_name, sort_order)
VALUES
  ('Theft', 'Theft', NULL, 20),
  ('Vehicle theft', 'Vehicle theft', 'Theft', 21),
  ('Motorcycle theft', 'Motorcycle theft', 'Theft', 22),
  ('Road furniture theft', 'Road furniture theft', 'Theft', 23),
  ('Vandalism', 'Vandalism', NULL, 24),
  ('Road furniture vandalism', 'Road furniture vandalism', 'Vandalism', 25)
ON CONFLICT (name) DO NOTHING;

COMMENT ON COLUMN public.hazard_types.parent_value IS
  'Optional stable parent hazard family; NULL means this row is a family or legacy value.';
COMMENT ON COLUMN public.news_categories.parent_name IS
  'Optional parent category name for controlled discovery; existing article text remains unchanged.';
COMMENT ON COLUMN public.accident_reports.incident_type IS
  'Optional stable incident taxonomy value; independent from severity and nullable when unsupported.';

-- Existing public SELECT grants and Task 30 taxonomy RLS remain applicable.
-- No public write policy, workflow change, notification change, or automatic
-- historical mapping is introduced by this review migration.
