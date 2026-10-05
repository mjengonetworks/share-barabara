-- TASK 30 REVIEW ONLY: safer lifecycle and labels for existing taxonomies.
-- Do not execute as part of Task 30 development.
--
-- The content tables intentionally remain TEXT and have no foreign keys. This
-- preserves old Article, Alert, Report and Page values and avoids making a
-- taxonomy edit rewrite historical content. `value`/`name` remains the stable
-- stored machine value; `label` is the future display-only label where the
-- original table did not already have one.

ALTER TABLE public.news_categories
  ADD COLUMN IF NOT EXISTS label TEXT;
UPDATE public.news_categories SET label = name WHERE label IS NULL;

ALTER TABLE public.page_categories
  ADD COLUMN IF NOT EXISTS label TEXT;
UPDATE public.page_categories SET label = name WHERE label IS NULL;

ALTER TABLE public.news_categories
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.page_categories
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.hazard_types
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.alert_severities
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.report_severities
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.news_categories
  ADD CONSTRAINT news_categories_sort_order_nonnegative CHECK (sort_order >= 0);
ALTER TABLE public.page_categories
  ADD CONSTRAINT page_categories_sort_order_nonnegative CHECK (sort_order >= 0);
ALTER TABLE public.hazard_types
  ADD CONSTRAINT hazard_types_sort_order_nonnegative CHECK (sort_order >= 0);
ALTER TABLE public.alert_severities
  ADD CONSTRAINT alert_severities_sort_order_nonnegative CHECK (sort_order >= 0);
ALTER TABLE public.report_severities
  ADD CONSTRAINT report_severities_sort_order_nonnegative CHECK (sort_order >= 0);

CREATE INDEX IF NOT EXISTS news_categories_active_order_idx
  ON public.news_categories (active, sort_order);
CREATE INDEX IF NOT EXISTS page_categories_active_order_idx
  ON public.page_categories (active, sort_order);
CREATE INDEX IF NOT EXISTS hazard_types_active_order_idx
  ON public.hazard_types (active, sort_order);
CREATE INDEX IF NOT EXISTS alert_severities_active_order_idx
  ON public.alert_severities (active, sort_order);
CREATE INDEX IF NOT EXISTS report_severities_active_order_idx
  ON public.report_severities (active, sort_order);

-- Editors and admins may add/update/archive. There is deliberately no DELETE
-- policy: deactivation preserves historical references.
DROP POLICY IF EXISTS "news_categories_write" ON public.news_categories;
CREATE POLICY "news_categories_editor_insert" ON public.news_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "news_categories_editor_update" ON public.news_categories FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "hazard_types_write" ON public.hazard_types;
CREATE POLICY "hazard_types_editor_insert" ON public.hazard_types FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "hazard_types_editor_update" ON public.hazard_types FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "alert_severities_write" ON public.alert_severities;
CREATE POLICY "alert_severities_editor_insert" ON public.alert_severities FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "alert_severities_editor_update" ON public.alert_severities FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "report_severities_write" ON public.report_severities;
CREATE POLICY "report_severities_editor_insert" ON public.report_severities FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "report_severities_editor_update" ON public.report_severities FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "page_categories_admin_delete" ON public.page_categories;
DROP POLICY IF EXISTS "page_categories_admin_insert" ON public.page_categories;
DROP POLICY IF EXISTS "page_categories_admin_update" ON public.page_categories;
CREATE POLICY "page_categories_editor_insert" ON public.page_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "page_categories_editor_update" ON public.page_categories FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

