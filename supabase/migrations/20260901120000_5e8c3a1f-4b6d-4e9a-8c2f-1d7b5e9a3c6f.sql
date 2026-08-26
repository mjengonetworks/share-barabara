-- ===== ADMIN DASHBOARD: new site-content tables =====

-- ----- Social links shown in the footer, editable from /admin -----
CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  icon_key TEXT NOT NULL CHECK (icon_key IN (
    'whatsapp','telegram','facebook','x','instagram','youtube','tiktok','linkedin','email','website'
  )),
  href TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "social_links_read" ON public.social_links FOR SELECT
  USING (active = true OR public.has_min_role(auth.uid(),'editor'));
CREATE POLICY "social_links_editor_write" ON public.social_links FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE TRIGGER social_links_touch_updated_at BEFORE UPDATE ON public.social_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.social_links (label, icon_key, href, sort_order) VALUES
  ('WhatsApp', 'whatsapp', 'https://whatsapp.com/channel/0029VbDqTJ4DzgTBbXMtC13J', 1),
  ('Telegram', 'telegram', 'https://t.me/+XLH1nWU-LYk4M2Q0', 2),
  ('Facebook', 'facebook', 'https://facebook.com/sharebaraba', 3),
  ('X', 'x', 'https://x.com/sharebaraba', 4),
  ('Instagram', 'instagram', 'https://instagram.com/sharebaraba', 5),
  ('YouTube', 'youtube', 'https://youtube.com/@sharebaraba', 6);

-- ----- Site-wide settings singleton (footer text, contact details) -----
CREATE TABLE public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  footer_tagline TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_editor_write" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE TRIGGER site_settings_touch_updated_at BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.site_settings (id, footer_tagline, contact_email, contact_phone) VALUES (
  1,
  'Share Barabara: promoting safer roads for all. News, hazard alerts, open crash statistics and reports from the community.',
  'info@sharebarabara.co.ke',
  '0701 951 682'
);

-- ----- Accident report view tracking (mirrors news_views, powers trending + stats) -----
CREATE TABLE public.accident_report_views (
  id BIGSERIAL PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.accident_reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX accident_report_views_report_time_idx ON public.accident_report_views (report_id, created_at DESC);
CREATE INDEX accident_report_views_time_idx ON public.accident_report_views (created_at DESC);
GRANT INSERT ON public.accident_report_views TO anon, authenticated;
GRANT ALL ON public.accident_report_views TO service_role;
ALTER TABLE public.accident_report_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accident_report_views_insert" ON public.accident_report_views FOR INSERT WITH CHECK (true);
CREATE POLICY "accident_report_views_read_editor" ON public.accident_report_views FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));

CREATE OR REPLACE FUNCTION public.trending_reports(hours_back INT DEFAULT 48, result_limit INT DEFAULT 5)
RETURNS SETOF public.accident_reports LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.* FROM public.accident_reports r
  JOIN (
    SELECT report_id, count(*) AS views
    FROM public.accident_report_views
    WHERE created_at > now() - (hours_back || ' hours')::interval
    GROUP BY report_id
    ORDER BY count(*) DESC
    LIMIT result_limit
  ) t ON t.report_id = r.id
  WHERE r.status = 'approved'
  ORDER BY t.views DESC;
$$;
REVOKE ALL ON FUNCTION public.trending_reports(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trending_reports(int,int) TO anon, authenticated;

-- ----- Newsletter broadcast log (composer in /admin logs intent; actual -----
-- ----- delivery needs an email provider wired up separately) -----
CREATE TABLE public.newsletter_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletter_broadcasts_admin_all" ON public.newsletter_broadcasts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
