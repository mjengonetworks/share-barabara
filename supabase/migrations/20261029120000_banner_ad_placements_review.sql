-- REVIEW CANDIDATE ONLY: do not apply without separate database approval.
-- Extends the existing banner_ads table; it does not create a competing ad system.
-- Rollback planning: first deploy code that no longer reads the new columns, then
-- review a separate DROP migration. Do not remove these columns while placement-aware
-- code is active, and do not delete existing advertisement rows during rollback.

ALTER TABLE public.banner_ads
  ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'site-default',
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.banner_ads'::regclass
      AND conname = 'banner_ads_valid_schedule'
  ) THEN
    ALTER TABLE public.banner_ads
      ADD CONSTRAINT banner_ads_valid_schedule
      CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS banner_ads_placement_priority_idx
  ON public.banner_ads (placement, priority DESC, created_at DESC);

DROP POLICY IF EXISTS "banner_ads_public_read" ON public.banner_ads;
CREATE POLICY "banner_ads_public_read" ON public.banner_ads
  FOR SELECT
  USING (active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()));
