-- Additive cross-content duplicate suggestions for incident review.
-- This extends the existing incident discovery review workflow; it never
-- merges or deletes source records automatically.
CREATE TABLE IF NOT EXISTS public.incident_duplicate_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_type TEXT NOT NULL CHECK (candidate_type IN ('discovery_candidate','alert','report','feed_post')),
  candidate_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('discovery_candidate','alert','report','feed_post')),
  target_id UUID NOT NULL,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','confirmed','not_duplicate','merged')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_type, candidate_id, target_type, target_id),
  CHECK (candidate_type <> target_type OR candidate_id <> target_id)
);

CREATE INDEX IF NOT EXISTS incident_duplicate_suggestions_queue_idx
  ON public.incident_duplicate_suggestions (status, confidence DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS incident_duplicate_suggestions_candidate_idx
  ON public.incident_duplicate_suggestions (candidate_type, candidate_id);
CREATE INDEX IF NOT EXISTS incident_duplicate_suggestions_target_idx
  ON public.incident_duplicate_suggestions (target_type, target_id);

ALTER TABLE public.incident_duplicate_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.incident_duplicate_suggestions FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON public.incident_duplicate_suggestions TO authenticated;
GRANT ALL ON public.incident_duplicate_suggestions TO service_role;

CREATE POLICY "editors review incident duplicate suggestions"
  ON public.incident_duplicate_suggestions FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "editors resolve incident duplicate suggestions"
  ON public.incident_duplicate_suggestions FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor') AND reviewed_by = auth.uid());

CREATE TRIGGER incident_duplicate_suggestions_touch
  BEFORE UPDATE ON public.incident_duplicate_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
