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
CREATE POLICY road_registry_history_insert_editor ON public.road_registry_history
  FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
GRANT SELECT, INSERT ON public.road_registry_history TO authenticated;
GRANT ALL ON public.road_registry_history TO service_role;

-- Public consumers may resolve verified active roads, but writes remain under
-- the existing editor policy and must be extended with an audited admin UI.
COMMENT ON TABLE public.roads IS 'Canonical road registry; geometry requires source attribution and editorial verification.';
COMMENT ON COLUMN public.roads.geometry IS 'GeoJSON LineString/MultiLineString supplied by an attributed geographic source; never AI coordinates alone.';
