-- Optional structured per-party casualty counts, for reporters willing to
-- specify them (otherwise it's just prose in the write-up). Also gives a
-- structured field a future AI extraction pass could populate from content.
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS casualty_breakdown JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS casualty_breakdown JSONB NOT NULL DEFAULT '{}';
