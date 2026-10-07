-- Review-only: external incident discovery creates admin drafts, never public rows.
CREATE TABLE IF NOT EXISTS public.incident_discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL UNIQUE CHECK (source_url ~* '^https?://'),
  source_title TEXT NOT NULL,
  source_excerpt TEXT NOT NULL,
  source_organization TEXT,
  source_published_at TIMESTAMPTZ,
  incident_type TEXT,
  location_hint TEXT,
  event_date DATE,
  fingerprint TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rejected', 'merged')),
  duplicate_of_report_id UUID REFERENCES public.accident_reports(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incident_discovery_candidates_status_idx
  ON public.incident_discovery_candidates (status, created_at DESC);

ALTER TABLE public.incident_discovery_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.incident_discovery_candidates FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.incident_discovery_candidates TO authenticated;
GRANT ALL ON public.incident_discovery_candidates TO service_role;

CREATE POLICY "editors review incident discovery drafts"
  ON public.incident_discovery_candidates FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "editors resolve incident discovery drafts"
  ON public.incident_discovery_candidates FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor') AND reviewed_by = auth.uid());

CREATE TRIGGER incident_discovery_candidates_touch
  BEFORE UPDATE ON public.incident_discovery_candidates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
