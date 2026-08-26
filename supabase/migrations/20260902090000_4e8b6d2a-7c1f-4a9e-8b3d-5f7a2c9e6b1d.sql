-- Alerts never had an image_url field (news and accident_reports already do).
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS image_url TEXT;
