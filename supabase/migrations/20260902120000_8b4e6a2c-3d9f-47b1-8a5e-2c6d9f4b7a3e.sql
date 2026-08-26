-- ===== CAMPAIGNS =====
-- Editor/admin-managed only (no public submission). Lifecycle (upcoming /
-- ongoing / previous) is derived from start_date/end_date at read time
-- rather than stored, so it can never drift out of sync with the calendar.
-- Once a campaign is over, editors write it up as a retrospective report
-- (report_content, rendered with the same rich-text-lite renderer as
-- articles/reports, so it can carry images and embedded video).

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  image_url TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  report_content TEXT,
  report_image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX campaigns_dates_idx ON public.campaigns (start_date, end_date);

CREATE TRIGGER campaigns_touch_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_public_read" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "campaigns_editor_write" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));
