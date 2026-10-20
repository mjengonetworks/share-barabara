-- Task 70: administrator-managed public ecosystem previews and house-ad settings.
-- Review and apply through the established migration process only.
-- This file is intentionally not executed by the application or deployment scripts.

-- Preflight existing prerequisites and same-name objects before any DDL.
DO $$
BEGIN
  IF to_regclass('public.banner_ads') IS NULL THEN
    RAISE EXCEPTION 'Task 70 requires existing public.banner_ads';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banner_ads'
      AND column_name = 'id' AND data_type = 'uuid'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banner_ads'
      AND column_name = 'title' AND data_type = 'text'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banner_ads'
      AND column_name = 'link_url' AND data_type = 'text'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'banner_ads'
      AND column_name = 'active' AND data_type = 'boolean'
  ) THEN
    RAISE EXCEPTION 'Task 70 found an incompatible public.banner_ads shape';
  END IF;

  IF to_regprocedure('public.has_min_role(uuid, public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'Task 70 requires public.has_min_role(uuid, public.app_role)';
  END IF;

  IF to_regprocedure('public.touch_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'Task 70 requires public.touch_updated_at()';
  END IF;

  IF to_regclass('public.ecosystem_previews') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ecosystem_previews' AND column_name = 'slug' AND data_type = 'text')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ecosystem_previews' AND column_name = 'display_name' AND data_type = 'text')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ecosystem_previews' AND column_name = 'description' AND data_type = 'text')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ecosystem_previews' AND column_name = 'destination_url' AND data_type = 'text')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ecosystem_previews' AND column_name = 'enabled' AND data_type = 'boolean') THEN
      RAISE EXCEPTION 'Task 70 found an incompatible public.ecosystem_previews shape';
    END IF;
  END IF;

  IF to_regclass('public.advertising_settings') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'advertising_settings' AND column_name = 'id' AND data_type = 'integer')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'advertising_settings' AND column_name = 'fallback_headline' AND data_type = 'text')
      OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'advertising_settings' AND column_name = 'fallback_enabled' AND data_type = 'boolean') THEN
      RAISE EXCEPTION 'Task 70 found an incompatible public.advertising_settings shape';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ecosystem_previews (
  slug TEXT PRIMARY KEY CHECK (slug IN ('mjengo-hub', 'mjengo-networks')),
  display_name TEXT NOT NULL CHECK (btrim(display_name) <> ''),
  description TEXT NOT NULL CHECK (btrim(description) <> ''),
  destination_url TEXT NOT NULL CHECK (destination_url ~ '^https?://'),
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ecosystem_previews_enabled_order_idx
  ON public.ecosystem_previews (enabled, sort_order, slug);

ALTER TABLE public.ecosystem_previews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ecosystem_previews_public_read" ON public.ecosystem_previews;
DROP POLICY IF EXISTS "ecosystem_previews_admin_read" ON public.ecosystem_previews;
CREATE POLICY "ecosystem_previews_admin_read" ON public.ecosystem_previews
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "ecosystem_previews_admin_write" ON public.ecosystem_previews;
CREATE POLICY "ecosystem_previews_admin_write" ON public.ecosystem_previews
  FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.ecosystem_previews FROM anon, authenticated;
GRANT SELECT ON TABLE public.ecosystem_previews TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.ecosystem_previews TO authenticated;

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
  fallback_headline TEXT NOT NULL DEFAULT 'Your Ad Here' CHECK (btrim(fallback_headline) <> ''),
  fallback_supporting_text TEXT NOT NULL DEFAULT '',
  fallback_destination_url TEXT NOT NULL DEFAULT '/partner-with-us' CHECK (btrim(fallback_destination_url) <> ''),
  fallback_style TEXT NOT NULL DEFAULT 'navy-gold' CHECK (fallback_style IN ('navy-gold')),
  fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.advertising_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advertising_settings_public_read" ON public.advertising_settings;
DROP POLICY IF EXISTS "advertising_settings_admin_read" ON public.advertising_settings;
CREATE POLICY "advertising_settings_admin_read" ON public.advertising_settings
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "advertising_settings_admin_write" ON public.advertising_settings;
CREATE POLICY "advertising_settings_admin_write" ON public.advertising_settings
  FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.advertising_settings FROM anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.advertising_settings TO authenticated;

INSERT INTO public.advertising_settings
  (id, fallback_headline, fallback_supporting_text, fallback_destination_url, fallback_style, fallback_enabled)
VALUES (1, 'Your Ad Here', '', '/partner-with-us', 'navy-gold', true)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE VIEW public.ecosystem_previews_public
WITH (security_invoker = false) AS
  SELECT slug, display_name, description, destination_url, icon_url, sort_order
  FROM public.ecosystem_previews
  WHERE enabled = true;

CREATE OR REPLACE VIEW public.advertising_settings_public
WITH (security_invoker = false) AS
  SELECT id, fallback_headline, fallback_supporting_text,
         fallback_destination_url, fallback_style, fallback_enabled
  FROM public.advertising_settings
  WHERE id = 1;

REVOKE ALL ON public.ecosystem_previews_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ecosystem_previews_public TO anon, authenticated;
REVOKE ALL ON public.advertising_settings_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.advertising_settings_public TO anon, authenticated;

DROP TRIGGER IF EXISTS ecosystem_previews_touch_updated_at ON public.ecosystem_previews;
CREATE TRIGGER ecosystem_previews_touch_updated_at
  BEFORE UPDATE ON public.ecosystem_previews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS advertising_settings_touch_updated_at ON public.advertising_settings;
CREATE TRIGGER advertising_settings_touch_updated_at
  BEFORE UPDATE ON public.advertising_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Explicit marker only. Existing banner_ads rows are not automatically classified.
ALTER TABLE public.banner_ads
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
