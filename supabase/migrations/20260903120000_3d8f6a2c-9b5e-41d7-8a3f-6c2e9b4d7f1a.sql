-- Admin-editable SEO overrides for articles and reports. NULL falls back to
-- the existing title/summary/description in head() meta tags.
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS seo_keywords TEXT;

ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS seo_keywords TEXT;
