-- Admin-editable Google "preferred source" link shown among the share icons
-- (replaces the previous hardcoded generic Google search link).
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS google_source_label TEXT NOT NULL DEFAULT 'Add as a preferred source on Google';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS google_source_url TEXT NOT NULL DEFAULT 'https://www.google.com/preferences/source/sharebarabara.co.ke';
