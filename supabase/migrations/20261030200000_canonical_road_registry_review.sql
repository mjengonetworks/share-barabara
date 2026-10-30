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
