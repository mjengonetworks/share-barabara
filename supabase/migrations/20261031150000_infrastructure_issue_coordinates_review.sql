-- REVIEW-ONLY: additive coordinate support for Infrastructure Issues.
-- Do not execute in production without separate owner approval, backup and rehearsal.
-- Existing records are intentionally not backfilled: unknown coordinates remain NULL.

ALTER TABLE public.infrastructure_issues
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_source text,
  ADD COLUMN IF NOT EXISTS location_verified_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.infrastructure_issues'::regclass
      AND conname = 'infrastructure_issues_coordinate_pair_valid'
  ) THEN
    ALTER TABLE public.infrastructure_issues
      ADD CONSTRAINT infrastructure_issues_coordinate_pair_valid
      CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR (
          latitude BETWEEN -90 AND 90
          AND longitude BETWEEN -180 AND 180
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS infrastructure_issues_coordinates_idx
  ON public.infrastructure_issues (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- RLS, existing policies, moderation fields and publication semantics are preserved.
