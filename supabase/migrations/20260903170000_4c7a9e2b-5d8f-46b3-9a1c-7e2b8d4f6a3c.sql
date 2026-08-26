-- Featured-image metadata (alt text, caption, credit) for articles and
-- reports, plus separate multi-image/video attachment galleries for alerts
-- and reports (distinct from any inline content images and, for reports,
-- distinct from the single featured image).
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS image_alt TEXT;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS image_caption TEXT;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS image_credit TEXT;

ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS image_alt TEXT;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS image_caption TEXT;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS image_credit TEXT;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';

ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';
