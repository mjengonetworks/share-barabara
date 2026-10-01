-- REVIEW-ONLY — Task 26 Statistics Modernization.
-- Do not execute until the schema, correction workflow, and live RLS behavior
-- have been reviewed. This migration does not alter or backfill legacy
-- *_stats rows and does not mark any existing value authoritative.

-- A dataset is a provenance container. It may remain a draft/archived legacy
-- import indefinitely; publication requires source and verification metadata.
CREATE TABLE IF NOT EXISTS public.statistics_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('fatalities', 'injuries', 'crashes', 'reports')),
  source_organization TEXT NOT NULL,
  source_url TEXT,
  methodology TEXT,
  geography_level TEXT NOT NULL DEFAULT 'national'
    CHECK (geography_level IN ('national', 'county', 'road', 'category')),
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived')),
  source_published_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CHECK (source_url IS NULL OR source_url ~* '^https?://'),
  CHECK (
    publication_status <> 'published'
    OR (
      source_url IS NOT NULL
      AND source_published_at IS NOT NULL
      AND published_at IS NOT NULL
      AND last_verified_at IS NOT NULL
    )
  )
);

-- Observations are immutable once published in normal editorial use. A
-- correction is a new revision: update the old row to superseded, then insert
-- the replacement in one transaction. The partial unique index permits only
-- one public revision for a dataset/dimension/period at a time.
CREATE TABLE IF NOT EXISTS public.statistics_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.statistics_datasets(id) ON DELETE RESTRICT,
  period_kind TEXT NOT NULL CHECK (period_kind IN ('annual', 'monthly', 'date_range', 'point_in_time')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  geography TEXT,
  category TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  record_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (record_status IN ('draft', 'published', 'superseded')),
  supersedes_observation_id UUID REFERENCES public.statistics_observations(id) ON DELETE RESTRICT,
  value NUMERIC NOT NULL CHECK (value >= 0),
  unit TEXT NOT NULL DEFAULT 'count'
    CHECK (unit IN ('count', 'percent', 'per_1,000', 'per_100,000', 'ratio')),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'provisional', 'final')),
  published_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_start <= period_end),
  CHECK (
    (period_kind = 'point_in_time' AND period_start = period_end)
    OR (period_kind <> 'point_in_time' AND period_start < period_end)
  ),
  CHECK (
    period_kind <> 'annual'
    OR (
      EXTRACT(MONTH FROM period_start) = 1
      AND EXTRACT(DAY FROM period_start) = 1
      AND EXTRACT(MONTH FROM period_end) = 12
      AND EXTRACT(DAY FROM period_end) = 31
      AND EXTRACT(YEAR FROM period_start) = EXTRACT(YEAR FROM period_end)
    )
  ),
  CHECK (
    period_kind <> 'monthly'
    OR (
      EXTRACT(DAY FROM period_start) = 1
      AND period_end = (date_trunc('month', period_start::timestamp) + interval '1 month - 1 day')::date
    )
  ),
  CHECK (record_status <> 'published' OR published_at IS NOT NULL),
  CHECK (record_status <> 'published' OR verification_status IN ('provisional', 'final'))
);

-- Evidence is data, not instructions. Proposals are isolated from public
-- reads and never publish or mutate datasets/observations by themselves.
CREATE TABLE IF NOT EXISTS public.statistics_update_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES public.statistics_datasets(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL CHECK (source_url ~* '^https?://'),
  source_organization TEXT,
  reporting_period_start DATE,
  reporting_period_end DATE,
  evidence_excerpt TEXT,
  proposed_update JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  proposed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (reporting_period_start IS NULL AND reporting_period_end IS NULL)
    OR (reporting_period_start IS NOT NULL AND reporting_period_end IS NOT NULL
        AND reporting_period_start <= reporting_period_end)
  ),
  CHECK (
    status = 'pending'
    OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS statistics_observations_period_idx
  ON public.statistics_observations (dataset_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS statistics_datasets_public_idx
  ON public.statistics_datasets (publication_status, metric, geography_level);
CREATE INDEX IF NOT EXISTS statistics_proposals_status_idx
  ON public.statistics_update_proposals (status, created_at DESC);

-- Dimension values may be NULL for national data. COALESCE in these indexes
-- prevents PostgreSQL NULL uniqueness from allowing duplicate national rows.
CREATE UNIQUE INDEX IF NOT EXISTS statistics_observations_revision_unique_idx
  ON public.statistics_observations (
    dataset_id, period_start, period_end, revision,
    COALESCE(geography, ''), COALESCE(category, '')
  );
CREATE UNIQUE INDEX IF NOT EXISTS statistics_observations_one_published_idx
  ON public.statistics_observations (
    dataset_id, period_start, period_end,
    COALESCE(geography, ''), COALESCE(category, '')
  ) WHERE record_status = 'published';

GRANT SELECT ON public.statistics_datasets, public.statistics_observations TO anon, authenticated;
GRANT INSERT, UPDATE ON public.statistics_datasets, public.statistics_observations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.statistics_update_proposals TO authenticated;
GRANT ALL ON public.statistics_datasets, public.statistics_observations,
  public.statistics_update_proposals TO service_role;

ALTER TABLE public.statistics_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statistics_update_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "statistics_datasets_public_published_read"
  ON public.statistics_datasets FOR SELECT
  USING (publication_status = 'published');
CREATE POLICY "statistics_datasets_editor_read"
  ON public.statistics_datasets FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "statistics_datasets_editor_insert"
  ON public.statistics_datasets FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "statistics_datasets_editor_update"
  ON public.statistics_datasets FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

CREATE POLICY "statistics_observations_public_published_read"
  ON public.statistics_observations FOR SELECT
  USING (
    record_status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.statistics_datasets d
      WHERE d.id = dataset_id AND d.publication_status = 'published'
    )
  );
CREATE POLICY "statistics_observations_editor_read"
  ON public.statistics_observations FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "statistics_observations_editor_insert"
  ON public.statistics_observations FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "statistics_observations_editor_update"
  ON public.statistics_observations FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

CREATE POLICY "statistics_proposals_editor_read"
  ON public.statistics_update_proposals FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'));
CREATE POLICY "statistics_proposals_editor_insert"
  ON public.statistics_update_proposals FOR INSERT TO authenticated
  WITH CHECK (
    public.has_min_role(auth.uid(), 'editor') AND proposed_by = auth.uid()
  );
CREATE POLICY "statistics_proposals_editor_update"
  ON public.statistics_update_proposals FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_min_role(auth.uid(), 'editor'));

CREATE OR REPLACE FUNCTION public.prevent_statistics_proposal_tampering()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.proposed_by IS DISTINCT FROM OLD.proposed_by THEN
    RAISE EXCEPTION 'Statistics proposal author is immutable';
  END IF;
  IF OLD.status IN ('accepted', 'rejected') AND (
    NEW.dataset_id IS DISTINCT FROM OLD.dataset_id
    OR NEW.source_url IS DISTINCT FROM OLD.source_url
    OR NEW.source_organization IS DISTINCT FROM OLD.source_organization
    OR NEW.reporting_period_start IS DISTINCT FROM OLD.reporting_period_start
    OR NEW.reporting_period_end IS DISTINCT FROM OLD.reporting_period_end
    OR NEW.evidence_excerpt IS DISTINCT FROM OLD.evidence_excerpt
    OR NEW.proposed_update IS DISTINCT FROM OLD.proposed_update
    OR NEW.status IS DISTINCT FROM OLD.status
  ) THEN
    RAISE EXCEPTION 'Reviewed statistics proposals are immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER statistics_proposals_immutable_review
  BEFORE UPDATE ON public.statistics_update_proposals
  FOR EACH ROW EXECUTE FUNCTION public.prevent_statistics_proposal_tampering();

CREATE OR REPLACE FUNCTION public.prevent_published_statistics_observation_edit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.record_status IN ('published', 'superseded') THEN
    IF NEW.dataset_id IS DISTINCT FROM OLD.dataset_id
      OR NEW.period_kind IS DISTINCT FROM OLD.period_kind
      OR NEW.period_start IS DISTINCT FROM OLD.period_start
      OR NEW.period_end IS DISTINCT FROM OLD.period_end
      OR NEW.geography IS DISTINCT FROM OLD.geography
      OR NEW.category IS DISTINCT FROM OLD.category
      OR NEW.revision IS DISTINCT FROM OLD.revision
      OR NEW.supersedes_observation_id IS DISTINCT FROM OLD.supersedes_observation_id
      OR NEW.value IS DISTINCT FROM OLD.value
      OR NEW.unit IS DISTINCT FROM OLD.unit
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.published_at IS DISTINCT FROM OLD.published_at
      OR NEW.notes IS DISTINCT FROM OLD.notes
    THEN
      RAISE EXCEPTION 'Published statistics observations are immutable; create a revision instead';
    END IF;
    IF OLD.record_status = 'superseded' AND NEW.record_status <> 'superseded' THEN
      RAISE EXCEPTION 'Superseded statistics observations cannot be republished';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER statistics_observations_immutable
  BEFORE UPDATE ON public.statistics_observations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_published_statistics_observation_edit();

CREATE TRIGGER statistics_datasets_touch
  BEFORE UPDATE ON public.statistics_datasets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER statistics_observations_touch
  BEFORE UPDATE ON public.statistics_observations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
