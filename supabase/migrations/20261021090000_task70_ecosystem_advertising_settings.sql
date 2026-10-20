-- Task 70: administrator-managed public ecosystem previews and house-ad settings.
-- Review and apply through the established migration process; this file is not
-- executed by the application or deployment scripts.

CREATE TABLE IF NOT EXISTS public.ecosystem_previews (
  slug TEXT PRIMARY KEY CHECK (slug IN ('mjengo-hub', 'mjengo-networks')),
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.ecosystem_previews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ecosystem_previews_public_read" ON public.ecosystem_previews;
CREATE POLICY "ecosystem_previews_public_read" ON public.ecosystem_previews
  FOR SELECT USING (enabled = true);
DROP POLICY IF EXISTS "ecosystem_previews_admin_write" ON public.ecosystem_previews;
CREATE POLICY "ecosystem_previews_admin_write" ON public.ecosystem_previews
  FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

INSERT INTO public.ecosystem_previews
  (slug, display_name, description, destination_url, sort_order, enabled)
VALUES
  (
    'mjengo-hub',
    'Mjengo Hub',
    'Construction news, industry insights, project tracking and documentation from Kenya and beyond.',
    'https://mjengohub.co.ke/',
    1,
    true
  ),
  (
    'mjengo-networks',
    'Mjengo Networks',
    'Find rated fundis, contractors, consultants and other professionals and service providers, with pricing, material price indices and automated quote generation from registered suppliers.',
    'https://mjengonetworks.co.ke/',
    2,
    true
  )
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.advertising_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  fallback_headline TEXT NOT NULL DEFAULT 'Your Ad Here',
  fallback_supporting_text TEXT NOT NULL DEFAULT '',
  fallback_destination_url TEXT NOT NULL DEFAULT '/partner-with-us',
  fallback_style TEXT NOT NULL DEFAULT 'navy-gold' CHECK (fallback_style IN ('navy-gold')),
  fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.advertising_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advertising_settings_public_read" ON public.advertising_settings;
CREATE POLICY "advertising_settings_public_read" ON public.advertising_settings
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "advertising_settings_admin_write" ON public.advertising_settings;
CREATE POLICY "advertising_settings_admin_write" ON public.advertising_settings
  FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

INSERT INTO public.advertising_settings
  (id, fallback_headline, fallback_supporting_text, fallback_destination_url, fallback_style, fallback_enabled)
VALUES (1, 'Your Ad Here', '', '/partner-with-us', 'navy-gold', true)
ON CONFLICT (id) DO NOTHING;

-- These are the known demo seed records. Existing manually created rows are
-- left untouched and remain eligible for the normal paid-ad review process.
ALTER TABLE public.banner_ads ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
UPDATE public.banner_ads
SET is_demo = true
WHERE link_url LIKE 'https://%example.%'
   OR lower(title) IN (
     'road safety starts with you',
     'drive safe, arrive alive',
     'comprehensive motor cover',
     'tyres that grip when it matters',
     'fuel up safely, every stop',
     'ride safe with us',
     'book your roadworthiness test',
     'emergency response, 24/7',
     'genuine parts, trusted fit',
     'plan your journey, check road status'
   );
