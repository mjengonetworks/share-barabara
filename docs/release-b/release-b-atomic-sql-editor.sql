-- REVIEW-ONLY SQL EDITOR RELEASE ARTIFACT: Share Barabara Release B
-- Rebuilt from the final reviewed migration files.
-- It is NOT a Supabase migration filename and must not be applied by migration tooling.
-- Execute the complete file as one SQL Editor batch only, after owner approval,
-- fresh backup and production preflight.
--
-- This script deliberately does not write supabase_migrations.schema_migrations.
-- SQL Editor execution is reconciled separately; see
-- docs/release-b/migration-ledger-reconciliation.md.
--
-- PostgreSQL transaction semantics provide atomicity: any statement error
-- aborts this transaction; SQL Editor must submit the file without splitting.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';

-- ===== BEGIN ORIGINAL MIGRATION 20261030200000 =====
-- REVIEW ONLY: canonical Road Registry extension for Share Barabara.
-- Do not apply until production approval, backup and rehearsal are complete.
-- Existing roads, alerts.road_id and accident_reports.road_id remain authoritative.

ALTER TABLE public.roads
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'KE',
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS county_context TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS localities TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS geometry JSONB,
  ADD COLUMN IF NOT EXISTS geometry_source TEXT,
  ADD COLUMN IF NOT EXISTS geometry_confidence TEXT,
  ADD COLUMN IF NOT EXISTS external_geo_id TEXT,
  ADD COLUMN IF NOT EXISTS registry_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.roads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS road_id UUID REFERENCES public.roads(id) ON DELETE SET NULL;
ALTER TABLE public.infrastructure_issues
  ADD COLUMN IF NOT EXISTS road_id UUID REFERENCES public.roads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS news_road_id_idx ON public.news (road_id);
CREATE INDEX IF NOT EXISTS infrastructure_issues_road_id_idx ON public.infrastructure_issues (road_id);

ALTER TABLE public.roads
  DROP CONSTRAINT IF EXISTS roads_geometry_confidence_check,
  ADD CONSTRAINT roads_geometry_confidence_check
    CHECK (geometry_confidence IS NULL OR geometry_confidence IN ('unverified','low','medium','high')),
  DROP CONSTRAINT IF EXISTS roads_registry_status_check,
  ADD CONSTRAINT roads_registry_status_check
    CHECK (registry_status IN ('active','inactive','merged'));

-- The legacy global name constraint prevents two verified roads with the same
-- name in different geographic contexts. Keep slug uniqueness for routing,
-- while name matching is handled by canonical context and aliases.
ALTER TABLE public.roads DROP CONSTRAINT IF EXISTS roads_name_key;
CREATE INDEX IF NOT EXISTS roads_country_name_idx ON public.roads (country_code, lower(name));
CREATE INDEX IF NOT EXISTS roads_aliases_gin_idx ON public.roads USING GIN (aliases);
CREATE INDEX IF NOT EXISTS roads_registry_status_idx ON public.roads (registry_status);
CREATE UNIQUE INDEX IF NOT EXISTS roads_external_geo_id_uidx
  ON public.roads (external_geo_id) WHERE external_geo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS roads_geometry_gin_idx ON public.roads USING GIN (geometry);

CREATE TABLE IF NOT EXISTS public.road_registry_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_id UUID NOT NULL REFERENCES public.roads(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','updated','merged','unmerged','geometry_reviewed')),
  before_state JSONB,
  after_state JSONB,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.road_registry_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS road_registry_history_read_editor ON public.road_registry_history;
CREATE POLICY road_registry_history_read_editor ON public.road_registry_history
  FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(), 'editor'));
DROP POLICY IF EXISTS road_registry_history_insert_editor ON public.road_registry_history;
-- History is written by the roads trigger, not by client-supplied JSON.
-- There are deliberately no authenticated UPDATE/DELETE policies.
REVOKE INSERT, UPDATE, DELETE ON public.road_registry_history FROM authenticated;
GRANT ALL ON public.road_registry_history TO service_role;

CREATE OR REPLACE FUNCTION public.record_road_registry_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.road_registry_history (road_id, action, before_state, after_state, changed_by)
    VALUES (NEW.id, 'created', NULL, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.road_registry_history (road_id, action, before_state, after_state, changed_by)
    VALUES (NEW.id, 'updated', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- The current roads trigger is INSERT/UPDATE only and client DELETE is
    -- prohibited. Keep the function safe if a future audited DELETE trigger
    -- invokes it: never dereference NEW during DELETE.
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Unsupported road registry trigger operation: %', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS roads_registry_history_trigger ON public.roads;
CREATE TRIGGER roads_registry_history_trigger
  AFTER INSERT OR UPDATE ON public.roads
  FOR EACH ROW EXECUTE FUNCTION public.record_road_registry_change();

-- A reviewed merge moves references to the canonical target in one transaction,
-- preserves the source row for auditability, and never fabricates a replacement
-- road.  Only administrators may invoke it.
CREATE OR REPLACE FUNCTION public.merge_road_registry_records(
  source_road_id UUID,
  target_road_id UUID,
  merge_reason TEXT
)
RETURNS public.roads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row public.roads;
  target_row public.roads;
BEGIN
  IF NOT public.has_min_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator role required';
  END IF;
  IF source_road_id IS NULL OR target_road_id IS NULL OR source_road_id = target_road_id THEN
    RAISE EXCEPTION 'Source and target roads must be distinct';
  END IF;
  SELECT * INTO source_row FROM public.roads WHERE id = source_road_id FOR UPDATE;
  SELECT * INTO target_row FROM public.roads WHERE id = target_road_id FOR UPDATE;
  IF source_row.id IS NULL OR target_row.id IS NULL THEN
    RAISE EXCEPTION 'Both roads must exist';
  END IF;

  -- canonical_accident_statistics is a view over accident_reports, so its
  -- road_id follows the redirected Report row and requires no separate write.
  -- If a deployment has materialised this relation as a table, update its
  -- direct road reference as part of the same merge; any other direct road
  -- foreign keys must be reviewed before this migration is approved.
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN information_schema.columns col
      ON col.table_schema = n.nspname
     AND col.table_name = c.relname
     AND col.column_name = 'road_id'
    WHERE n.nspname = 'public'
      AND c.relname = 'canonical_accident_statistics'
      AND c.relkind IN ('r','p')
  ) THEN
    UPDATE public.canonical_accident_statistics
    SET road_id = target_road_id
    WHERE road_id = source_road_id;
  END IF;

  UPDATE public.accident_reports SET road_id = target_road_id WHERE road_id = source_road_id;
  UPDATE public.alerts SET road_id = target_road_id WHERE road_id = source_road_id;
  UPDATE public.news SET road_id = target_road_id WHERE road_id = source_road_id;
  UPDATE public.infrastructure_issues SET road_id = target_road_id WHERE road_id = source_road_id;
  UPDATE public.roads
    SET registry_status = 'merged', merged_into_id = target_road_id,
        updated_at = now(), updated_by = auth.uid()
    WHERE id = source_road_id;
  INSERT INTO public.road_registry_history (road_id, action, before_state, after_state, changed_by)
  VALUES (source_road_id, 'merged', to_jsonb(source_row),
          jsonb_build_object('merged_into_id', target_road_id, 'reason', merge_reason), auth.uid());
  RETURN target_row;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_road_registry_records(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_road_registry_records(UUID, UUID, TEXT) TO authenticated;

-- Public consumers may resolve verified active roads, but writes remain under
-- the existing editor policy and must be extended with an audited admin UI.
COMMENT ON TABLE public.roads IS 'Canonical road registry; geometry requires source attribution and editorial verification.';
COMMENT ON COLUMN public.roads.geometry IS 'GeoJSON LineString/MultiLineString supplied by an attributed geographic source; never AI coordinates alone.';

-- ===== END ORIGINAL MIGRATION 20261030200000 =====

-- ===== BEGIN ORIGINAL MIGRATION 20261030210000 =====
-- REVIEW ONLY: idempotent publication bridge from canonical editorial records
-- to the existing public Feed. Do not execute without backup, rehearsal and
-- separate production approval.

CREATE TABLE IF NOT EXISTS public.editorial_feed_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('article','report','alert','infrastructure','campaign')),
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  href TEXT NOT NULL,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS editorial_feed_entries_public_idx
  ON public.editorial_feed_entries (active, published_at DESC);
CREATE INDEX IF NOT EXISTS editorial_feed_entries_source_idx
  ON public.editorial_feed_entries (source_type, source_id);

ALTER TABLE public.editorial_feed_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS editorial_feed_entries_public_read ON public.editorial_feed_entries;
CREATE POLICY editorial_feed_entries_public_read ON public.editorial_feed_entries
  FOR SELECT USING (active = true);
GRANT SELECT ON public.editorial_feed_entries TO anon, authenticated;
GRANT ALL ON public.editorial_feed_entries TO service_role;

CREATE OR REPLACE FUNCTION public.sync_editorial_feed_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_id UUID;
  v_source_type TEXT := TG_ARGV[0];
  row JSONB;
  eligible BOOLEAN := false;
  title_value TEXT;
  excerpt_value TEXT;
  href_value TEXT;
  image_value TEXT;
  published_value TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_source_id := OLD.id;
    UPDATE public.editorial_feed_entries AS entry SET active = false, updated_at = now()
    WHERE entry.source_type = v_source_type
      AND entry.source_id = v_source_id;
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    v_source_id := NEW.id;
    row := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_source_id := NEW.id;
    row := to_jsonb(NEW);
  ELSE
    RAISE EXCEPTION 'Unsupported editorial Feed trigger operation: %', TG_OP;
  END IF;

  title_value := NULLIF(btrim(COALESCE(row->>'title', '')), '');
  excerpt_value := COALESCE(NULLIF(row->>'summary', ''), NULLIF(row->>'description', ''), NULLIF(row->>'body', ''));
  image_value := COALESCE(NULLIF(row->>'image_url', ''), NULLIF(row->>'featured_image_url', ''));
  published_value := COALESCE(NULLIF(row->>'published_at', '')::TIMESTAMPTZ, NULLIF(row->>'created_at', '')::TIMESTAMPTZ);

  IF v_source_type = 'article' THEN
    eligible := COALESCE(row->>'status' = 'published', false) AND row->>'deleted_at' IS NULL;
    href_value := '/news/' || COALESCE(row->>'slug', v_source_id::TEXT);
  ELSIF v_source_type = 'report' THEN
    eligible := COALESCE(row->>'status' = 'approved', false) AND row->>'deleted_at' IS NULL;
    href_value := '/reports/' || v_source_id::TEXT;
  ELSIF v_source_type = 'alert' THEN
    eligible := (row->>'status' IS NULL OR row->>'status' IN ('active','in_progress','under_resolution','resolved')) AND row->>'deleted_at' IS NULL;
    href_value := '/alerts/' || v_source_id::TEXT;
  ELSIF v_source_type = 'infrastructure' THEN
    eligible := COALESCE(row->>'status' = 'approved', false) AND row->>'deleted_at' IS NULL;
    href_value := '/infrastructure-issues/' || v_source_id::TEXT;
  ELSIF v_source_type = 'campaign' THEN
    -- Campaigns have no status column. Match the existing public eligibility
    -- boundary: an undeleted campaign is public while current/future, or when
    -- its separately authored report is explicitly published.
    eligible := row->>'deleted_at' IS NULL
      AND (
        COALESCE((row->>'end_date')::DATE >= CURRENT_DATE, false)
        OR COALESCE(row->>'report_published' = 'true', false)
      );
    href_value := '/campaigns/' || COALESCE(row->>'slug', v_source_id::TEXT);
  END IF;

  INSERT INTO public.editorial_feed_entries
    (source_type, source_id, title, excerpt, href, image_url, published_at, active, updated_at)
  VALUES
    (v_source_type, v_source_id, COALESCE(title_value, v_source_type || ' update'), excerpt_value, href_value, image_value, published_value, eligible, now())
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    href = EXCLUDED.href,
    image_url = EXCLUDED.image_url,
    published_at = EXCLUDED.published_at,
    active = EXCLUDED.active,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- The triggers are additive and idempotent. Existing community feed_posts are
-- untouched and remain the canonical community-authored source.
DROP TRIGGER IF EXISTS editorial_feed_article_sync ON public.news;
CREATE TRIGGER editorial_feed_article_sync AFTER INSERT OR UPDATE OR DELETE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('article');
DROP TRIGGER IF EXISTS editorial_feed_report_sync ON public.accident_reports;
CREATE TRIGGER editorial_feed_report_sync AFTER INSERT OR UPDATE OR DELETE ON public.accident_reports
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('report');
DROP TRIGGER IF EXISTS editorial_feed_alert_sync ON public.alerts;
CREATE TRIGGER editorial_feed_alert_sync AFTER INSERT OR UPDATE OR DELETE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('alert');
DROP TRIGGER IF EXISTS editorial_feed_infrastructure_sync ON public.infrastructure_issues;
CREATE TRIGGER editorial_feed_infrastructure_sync AFTER INSERT OR UPDATE OR DELETE ON public.infrastructure_issues
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('infrastructure');
DROP TRIGGER IF EXISTS editorial_feed_campaign_sync ON public.campaigns;
CREATE TRIGGER editorial_feed_campaign_sync AFTER INSERT OR UPDATE OR DELETE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.sync_editorial_feed_entry('campaign');

REVOKE ALL ON FUNCTION public.sync_editorial_feed_entry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_editorial_feed_entry() TO service_role;

-- ===== END ORIGINAL MIGRATION 20261030210000 =====

-- ===== BEGIN ORIGINAL MIGRATION 20261030220000 =====
-- REVIEW ONLY: harden canonical Road Registry writes after production policy review.
-- Apply only after 20261030200000_canonical_road_registry_review.sql.
-- Do not execute in production without separate approval and a fresh backup.

-- The legacy policy allowed any authenticated user to create canonical roads.
-- Autocomplete resolves existing rows; it must not depend on client INSERT.
DROP POLICY IF EXISTS roads_insert_authenticated ON public.roads;
DROP POLICY IF EXISTS roads_insert_editor ON public.roads;
CREATE POLICY roads_insert_editor ON public.roads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

-- Retain the existing editor update boundary explicitly. There is deliberately
-- no DELETE policy: canonical roads are retired or merged, never client-deleted.
DROP POLICY IF EXISTS roads_update_editor ON public.roads;
CREATE POLICY roads_update_editor ON public.roads
  FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

-- Public readers resolve only active canonical records. Merged and inactive
-- rows remain available to authorised editorial tooling and audit history.
DROP POLICY IF EXISTS roads_public_read ON public.roads;
DROP POLICY IF EXISTS roads_public_read_eligible ON public.roads;
CREATE POLICY roads_public_read_eligible ON public.roads
  FOR SELECT TO public
  USING (COALESCE(registry_status, 'active') = 'active' AND merged_into_id IS NULL);

REVOKE INSERT, UPDATE, DELETE ON public.roads FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_road_registry_records(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_road_registry_records(UUID, UUID, TEXT) TO authenticated;

COMMENT ON POLICY roads_insert_editor ON public.roads IS
  'Only editor-level users may create canonical roads; autocomplete never grants client INSERT.';
COMMENT ON POLICY roads_update_editor ON public.roads IS
  'Only editor-level users may update canonical roads; merge remains administrator-only.';

-- ===== END ORIGINAL MIGRATION 20261030220000 =====

-- Release B postconditions: fail the transaction if the reviewed objects,
-- all five Feed triggers, or final road write boundary are not present.
DO $$
DECLARE
  expected RECORD;
BEGIN
  IF to_regclass('public.road_registry_history') IS NULL THEN
    RAISE EXCEPTION 'Release B postcondition failed: road_registry_history missing';
  END IF;
  IF to_regclass('public.editorial_feed_entries') IS NULL THEN
    RAISE EXCEPTION 'Release B postcondition failed: editorial_feed_entries missing';
  END IF;
  FOR expected IN
    SELECT * FROM (VALUES
      ('editorial_feed_article_sync', 'public.news'::regclass),
      ('editorial_feed_report_sync', 'public.accident_reports'::regclass),
      ('editorial_feed_alert_sync', 'public.alerts'::regclass),
      ('editorial_feed_infrastructure_sync', 'public.infrastructure_issues'::regclass),
      ('editorial_feed_campaign_sync', 'public.campaigns'::regclass)
    ) AS trigger_expectation(trigger_name, relation_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = expected.trigger_name
        AND tgrelid = expected.relation_name
        AND NOT tgisinternal
    ) THEN
      RAISE EXCEPTION 'Release B postcondition failed: trigger % missing on %',
        expected.trigger_name, expected.relation_name;
    END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roads'
      AND policyname = 'roads_insert_editor'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roads'
      AND policyname = 'roads_update_editor'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roads'
      AND policyname = 'roads_public_read_eligible'
  ) THEN
    RAISE EXCEPTION 'Release B postcondition failed: expected final road RLS policies missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roads'
      AND policyname = 'roads_insert_authenticated'
  ) THEN
    RAISE EXCEPTION 'Release B postcondition failed: permissive roads_insert_authenticated remains';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'roads'
      AND policyname NOT IN ('roads_insert_editor','roads_update_editor','roads_public_read_eligible')
  ) THEN
    RAISE EXCEPTION 'Release B postcondition failed: unexpected roads policy remains';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.road_registry_history'::regclass AND relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.editorial_feed_entries'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Release B postcondition failed: RLS is not enabled on new tables';
  END IF;
END $$;

COMMIT;

