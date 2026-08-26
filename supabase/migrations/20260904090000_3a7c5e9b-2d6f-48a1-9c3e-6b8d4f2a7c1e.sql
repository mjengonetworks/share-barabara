-- Corrected Google "preferred source" URL format (query param, not a path segment).
ALTER TABLE public.site_settings ALTER COLUMN google_source_url
  SET DEFAULT 'https://www.google.com/preferences/source?q=sharebarabara.co.ke';
UPDATE public.site_settings SET google_source_url = 'https://www.google.com/preferences/source?q=sharebarabara.co.ke'
  WHERE id = 1;
