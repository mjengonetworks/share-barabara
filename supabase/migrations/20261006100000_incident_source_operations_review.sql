-- Additive Task 25 operations layer. Existing incident discovery candidates remain
-- the only incident-draft store; these tables only describe monitored sources
-- and auditable retrieval runs.
CREATE TABLE IF NOT EXISTS public.incident_monitor_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  base_url TEXT NOT NULL CHECK (base_url ~* '^https://'),
  source_class TEXT NOT NULL DEFAULT 'unknown' CHECK (source_class IN ('official_authority','primary_source','reputable_secondary','social_or_user_generated','unknown')),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  candidate_count INTEGER NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (base_url)
);

CREATE TABLE IF NOT EXISTS public.incident_monitor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.incident_monitor_sources(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed','unavailable')),
  queries_run INTEGER NOT NULL DEFAULT 0 CHECK (queries_run >= 0),
  candidates_created INTEGER NOT NULL DEFAULT 0 CHECK (candidates_created >= 0),
  error_message TEXT
);

ALTER TABLE public.incident_discovery_candidates
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.incident_monitor_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_confidence NUMERIC(5,4) CHECK (duplicate_confidence IS NULL OR duplicate_confidence BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS duplicate_reason TEXT;

CREATE INDEX IF NOT EXISTS incident_monitor_sources_enabled_idx
  ON public.incident_monitor_sources (enabled, last_checked_at);
CREATE INDEX IF NOT EXISTS incident_monitor_runs_source_started_idx
  ON public.incident_monitor_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS incident_discovery_candidates_source_idx
  ON public.incident_discovery_candidates (source_id, status, created_at DESC);

ALTER TABLE public.incident_monitor_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_monitor_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.incident_monitor_sources FROM PUBLIC, anon;
REVOKE ALL ON public.incident_monitor_runs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.incident_monitor_sources TO authenticated;
GRANT SELECT ON public.incident_monitor_runs TO authenticated;
GRANT ALL ON public.incident_monitor_sources, public.incident_monitor_runs TO service_role;

DROP POLICY IF EXISTS "editors manage incident monitor sources" ON public.incident_monitor_sources;
CREATE POLICY "editors manage incident monitor sources"
  ON public.incident_monitor_sources FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

DROP POLICY IF EXISTS "editors view incident monitor runs" ON public.incident_monitor_runs;
CREATE POLICY "editors view incident monitor runs"
  ON public.incident_monitor_runs FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));

DROP TRIGGER IF EXISTS incident_monitor_sources_touch ON public.incident_monitor_sources;
CREATE TRIGGER incident_monitor_sources_touch
  BEFORE UPDATE ON public.incident_monitor_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
