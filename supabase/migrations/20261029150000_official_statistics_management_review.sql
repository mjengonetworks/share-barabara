-- REVIEW CANDIDATE — official statistics administration.
-- Depends on 20260930100000_statistics_modernization_review.sql.
-- Do not apply until separately approved. This is additive and never rewrites
-- legacy yearly_stats rows or internal canonical incident statistics.

-- The existing Statistics page is also backed by these legacy aggregate tables.
-- Extend those rows in place so historical years remain the same records and
-- become manageable through the same source/publication/audit contract.
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'yearly_stats', 'monthly_stats', 'county_stats', 'victim_stats',
    'cause_stats', 'vehicle_stats', 'time_of_day_stats', 'road_class_stats'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT ''published''
        CHECK (publication_status IN (''draft'', ''published'', ''archived'')),
      ADD COLUMN IF NOT EXISTS source_organization TEXT,
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS source_document_url TEXT,
      ADD COLUMN IF NOT EXISTS reporting_period_start DATE,
      ADD COLUMN IF NOT EXISTS reporting_period_end DATE,
      ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL', table_name);
  END LOOP;
END $$;

UPDATE public.yearly_stats
SET reporting_period_start = COALESCE(reporting_period_start, make_date(year, 1, 1)),
    reporting_period_end = COALESCE(reporting_period_end, make_date(year, 12, 31))
WHERE reporting_period_start IS NULL OR reporting_period_end IS NULL;
UPDATE public.monthly_stats
SET reporting_period_start = COALESCE(reporting_period_start, make_date(year, month, 1)),
    reporting_period_end = COALESCE(reporting_period_end, (date_trunc('month', make_date(year, month, 1)::timestamp) + interval '1 month - 1 day')::date)
WHERE reporting_period_start IS NULL OR reporting_period_end IS NULL;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['county_stats', 'victim_stats', 'cause_stats', 'vehicle_stats', 'time_of_day_stats', 'road_class_stats'] LOOP
    EXECUTE format('UPDATE public.%I SET reporting_period_start = COALESCE(reporting_period_start, make_date(year, 1, 1)), reporting_period_end = COALESCE(reporting_period_end, make_date(year, 12, 31)) WHERE reporting_period_start IS NULL OR reporting_period_end IS NULL', table_name);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.legacy_statistics_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  row_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'published', 'unpublished', 'corrected', 'deleted')),
  before_record JSONB,
  after_record JSONB,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legacy_statistics_revisions_row_idx
  ON public.legacy_statistics_revisions (source_table, row_key, created_at DESC);
ALTER TABLE public.legacy_statistics_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS legacy_statistics_revisions_editor_read ON public.legacy_statistics_revisions;
CREATE POLICY legacy_statistics_revisions_editor_read
  ON public.legacy_statistics_revisions FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));
GRANT SELECT ON public.legacy_statistics_revisions TO authenticated;
GRANT ALL ON public.legacy_statistics_revisions TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_statistics_revision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Statistics revision history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS legacy_statistics_revisions_append_only ON public.legacy_statistics_revisions;
CREATE TRIGGER legacy_statistics_revisions_append_only
  BEFORE UPDATE OR DELETE ON public.legacy_statistics_revisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_statistics_revision_mutation();

CREATE OR REPLACE FUNCTION public.record_legacy_statistics_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE row_key TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_key := COALESCE(to_jsonb(OLD)->>'id', to_jsonb(OLD)->>'year');
  ELSE
    row_key := COALESCE(to_jsonb(NEW)->>'id', to_jsonb(NEW)->>'year');
  END IF;
  INSERT INTO public.legacy_statistics_revisions
    (source_table, row_key, action, before_record, after_record, actor_id)
  VALUES (
    TG_TABLE_NAME, row_key,
    CASE WHEN TG_OP = 'INSERT' THEN 'created'
         WHEN TG_OP = 'DELETE' THEN 'deleted'
         WHEN OLD.publication_status <> 'published' AND NEW.publication_status = 'published' THEN 'published'
         WHEN OLD.publication_status = 'published' AND NEW.publication_status <> 'published' THEN 'unpublished'
         ELSE 'updated' END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    auth.uid());
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'yearly_stats', 'monthly_stats', 'county_stats', 'victim_stats',
    'cause_stats', 'vehicle_stats', 'time_of_day_stats', 'road_class_stats'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', table_name || '_revision_audit', table_name);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.record_legacy_statistics_revision()', table_name || '_revision_audit', table_name);
  END LOOP;
END $$;

-- Existing rows remain public by default. Admin publication controls now make
-- archived/draft rows disappear from public charts without deleting history.
DROP POLICY IF EXISTS "yearly_public_read" ON public.yearly_stats;
CREATE POLICY "yearly_public_read" ON public.yearly_stats FOR SELECT USING (publication_status = 'published');
DROP POLICY IF EXISTS "monthly_public_read" ON public.monthly_stats;
CREATE POLICY "monthly_public_read" ON public.monthly_stats FOR SELECT USING (publication_status = 'published');
DROP POLICY IF EXISTS "county_public_read" ON public.county_stats;
CREATE POLICY "county_public_read" ON public.county_stats FOR SELECT USING (publication_status = 'published');
DROP POLICY IF EXISTS "victim_public_read" ON public.victim_stats;
CREATE POLICY "victim_public_read" ON public.victim_stats FOR SELECT USING (publication_status = 'published');
DROP POLICY IF EXISTS "cause_public_read" ON public.cause_stats;
CREATE POLICY "cause_public_read" ON public.cause_stats FOR SELECT USING (publication_status = 'published');
DROP POLICY IF EXISTS "vehicle_public_read" ON public.vehicle_stats;
CREATE POLICY "vehicle_public_read" ON public.vehicle_stats FOR SELECT USING (publication_status = 'published');
DROP POLICY IF EXISTS "tod_public_read" ON public.time_of_day_stats;
CREATE POLICY "tod_public_read" ON public.time_of_day_stats FOR SELECT USING (publication_status = 'published');
DROP POLICY IF EXISTS "roadclass_public_read" ON public.road_class_stats;
CREATE POLICY "roadclass_public_read" ON public.road_class_stats FOR SELECT USING (publication_status = 'published');

ALTER TABLE public.statistics_datasets
  ADD COLUMN IF NOT EXISTS metric_type TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'count',
  ADD COLUMN IF NOT EXISTS geography_scope TEXT,
  ADD COLUMN IF NOT EXISTS reporting_period_start DATE,
  ADD COLUMN IF NOT EXISTS reporting_period_end DATE,
  ADD COLUMN IF NOT EXISTS source_document_url TEXT,
  ADD COLUMN IF NOT EXISTS publication_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.statistics_datasets
SET metric_type = CASE metric
  WHEN 'fatalities' THEN 'deaths'
  WHEN 'injuries' THEN 'total_injuries'
  WHEN 'crashes' THEN 'crashes'
  WHEN 'reports' THEN 'reports'
  ELSE metric
END
WHERE metric_type IS NULL;

ALTER TABLE public.statistics_datasets
  ALTER COLUMN metric_type SET DEFAULT 'other';

CREATE TABLE IF NOT EXISTS public.statistics_dataset_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.statistics_datasets(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'published', 'unpublished', 'corrected')),
  before_record JSONB,
  after_record JSONB,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS statistics_dataset_revisions_dataset_idx
  ON public.statistics_dataset_revisions (dataset_id, created_at DESC);

ALTER TABLE public.statistics_dataset_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS statistics_dataset_revisions_editor_read ON public.statistics_dataset_revisions;
CREATE POLICY statistics_dataset_revisions_editor_read
  ON public.statistics_dataset_revisions FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));

DROP TRIGGER IF EXISTS statistics_dataset_revisions_append_only ON public.statistics_dataset_revisions;
CREATE TRIGGER statistics_dataset_revisions_append_only
  BEFORE UPDATE OR DELETE ON public.statistics_dataset_revisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_statistics_revision_mutation();

REVOKE INSERT, UPDATE, DELETE ON public.statistics_datasets, public.statistics_observations FROM authenticated;
-- Published statistics observations are immutable; corrections use a new
-- observation revision and the existing immutability trigger.
GRANT SELECT ON public.statistics_dataset_revisions TO authenticated;
GRANT ALL ON public.statistics_dataset_revisions TO service_role;

CREATE OR REPLACE FUNCTION public.record_statistics_dataset_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.statistics_dataset_revisions
    (dataset_id, action, before_record, after_record, actor_id)
  VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN OLD.publication_status <> 'published' AND NEW.publication_status = 'published' THEN 'published'
      WHEN OLD.publication_status = 'published' AND NEW.publication_status <> 'published' THEN 'unpublished'
      ELSE 'updated'
    END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    to_jsonb(NEW),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS statistics_dataset_revision_audit ON public.statistics_datasets;
CREATE TRIGGER statistics_dataset_revision_audit
  AFTER INSERT OR UPDATE ON public.statistics_datasets
  FOR EACH ROW EXECUTE FUNCTION public.record_statistics_dataset_revision();

CREATE OR REPLACE FUNCTION public.require_statistics_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_official_statistics_dataset(
  _title TEXT, _metric_type TEXT, _unit TEXT, _geography_level TEXT,
  _source_organization TEXT, _source_url TEXT, _source_document_url TEXT,
  _reporting_period_start DATE, _reporting_period_end DATE,
  _methodology TEXT DEFAULT NULL, _notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID;
BEGIN
  PERFORM public.require_statistics_admin();
  INSERT INTO public.statistics_datasets
    (title, metric, metric_type, unit, geography_level, geography_scope,
     source_organization, source_url, source_document_url,
     reporting_period_start, reporting_period_end, methodology, notes,
     created_by, updated_by, author_id, editor_id)
  VALUES (
    _title,
    CASE WHEN _metric_type IN ('deaths','fatalities') THEN 'fatalities'
         WHEN _metric_type IN ('serious_injuries','slight_injuries','total_injuries','injuries') THEN 'injuries'
         WHEN _metric_type = 'crashes' THEN 'crashes' ELSE 'reports' END,
    _metric_type, _unit, _geography_level, _geography_level,
    _source_organization, _source_url, _source_document_url,
    _reporting_period_start, _reporting_period_end, _methodology, _notes,
    auth.uid(), auth.uid(), auth.uid(), auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_official_statistics_dataset(_dataset_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_statistics_admin();
  UPDATE public.statistics_datasets
  SET publication_status = 'published', published_at = COALESCE(publication_date, now()),
      last_verified_at = COALESCE(verification_date, now()), updated_by = auth.uid(), editor_id = auth.uid()
  WHERE id = _dataset_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Statistics dataset not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_official_statistics_dataset(
  _dataset_id UUID, _title TEXT, _source_organization TEXT, _source_url TEXT,
  _source_document_url TEXT, _reporting_period_start DATE,
  _reporting_period_end DATE, _methodology TEXT, _notes TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_statistics_admin();
  UPDATE public.statistics_datasets
  SET title = _title, source_organization = _source_organization,
      source_url = _source_url, source_document_url = _source_document_url,
      reporting_period_start = _reporting_period_start,
      reporting_period_end = _reporting_period_end, methodology = _methodology,
      notes = _notes, updated_by = auth.uid(), editor_id = auth.uid()
  WHERE id = _dataset_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Statistics dataset not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_official_statistics_observation(
  _dataset_id UUID, _period_kind TEXT, _period_start DATE, _period_end DATE,
  _value NUMERIC, _verification_status TEXT DEFAULT 'provisional', _notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID;
BEGIN
  PERFORM public.require_statistics_admin();
  INSERT INTO public.statistics_observations
    (dataset_id, period_kind, period_start, period_end, value, verification_status, notes)
  VALUES (_dataset_id, _period_kind, _period_start, _period_end, _value, _verification_status, _notes)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.correct_official_statistics_observation(
  _observation_id UUID, _value NUMERIC, _verification_status TEXT, _notes TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.statistics_observations%ROWTYPE; new_id UUID;
BEGIN
  PERFORM public.require_statistics_admin();
  SELECT * INTO old_row FROM public.statistics_observations WHERE id = _observation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Statistics observation not found'; END IF;
  IF old_row.record_status <> 'published' THEN RAISE EXCEPTION 'Only a published observation can be corrected'; END IF;
  UPDATE public.statistics_observations SET record_status = 'superseded', updated_at = now() WHERE id = _observation_id;
  INSERT INTO public.statistics_observations
    (dataset_id, period_kind, period_start, period_end, geography, category,
     revision, record_status, supersedes_observation_id, value, unit,
     verification_status, published_at, notes)
  VALUES (old_row.dataset_id, old_row.period_kind, old_row.period_start,
    old_row.period_end, old_row.geography, old_row.category, old_row.revision + 1,
    'published', old_row.id, _value, old_row.unit, _verification_status,
    now(), _notes)
  RETURNING id INTO new_id;
  INSERT INTO public.statistics_dataset_revisions
    (dataset_id, action, before_record, after_record, actor_id)
  VALUES (old_row.dataset_id, 'corrected', to_jsonb(old_row),
    (SELECT to_jsonb(o) FROM public.statistics_observations o WHERE o.id = new_id), auth.uid());
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_official_statistics_dataset(_dataset_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_statistics_admin();
  UPDATE public.statistics_datasets
  SET publication_status = 'archived', updated_by = auth.uid(), editor_id = auth.uid()
  WHERE id = _dataset_id AND publication_status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'Published statistics dataset not found'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_official_statistics_dataset(text,text,text,text,text,text,text,date,date,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_official_statistics_dataset(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_official_statistics_dataset(uuid,text,text,text,text,date,date,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_official_statistics_observation(uuid,text,date,date,numeric,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.correct_official_statistics_observation(uuid,numeric,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unpublish_official_statistics_dataset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_official_statistics_dataset(text,text,text,text,text,text,text,date,date,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_official_statistics_dataset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_official_statistics_dataset(uuid,text,text,text,text,date,date,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_official_statistics_observation(uuid,text,date,date,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_official_statistics_observation(uuid,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_official_statistics_dataset(uuid) TO authenticated;
