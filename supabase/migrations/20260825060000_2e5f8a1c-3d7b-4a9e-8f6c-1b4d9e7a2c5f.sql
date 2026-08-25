
-- ===== BANNER ADS =====
CREATE TABLE public.banner_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  advertiser TEXT,
  image_url TEXT,
  link_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banner_ads TO anon, authenticated;
GRANT ALL ON public.banner_ads TO service_role;
ALTER TABLE public.banner_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banner_ads_public_read" ON public.banner_ads FOR SELECT USING (active = true);
CREATE POLICY "banner_ads_editor_read_all" ON public.banner_ads FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY "banner_ads_editor_write" ON public.banner_ads FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

-- ===== PARTNER / ADVERTISING ENQUIRIES =====
CREATE TABLE public.partner_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  goals TEXT NOT NULL,
  budget TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.partner_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.partner_enquiries TO authenticated;
GRANT ALL ON public.partner_enquiries TO service_role;
ALTER TABLE public.partner_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_enquiries_insert" ON public.partner_enquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "partner_enquiries_read_editor" ON public.partner_enquiries FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY "partner_enquiries_update_editor" ON public.partner_enquiries FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
