-- ===== POST AS A PAGE =====
-- A Page is not a separate auth principal: user_id/author_id always stays the
-- real signed-in user (that's what RLS ownership checks against). page_id is
-- an optional "posted as" label — set only when the owner chose to browse as
-- one of their pages — and everything the page has posted rolls up onto its
-- own profile like a user's contributions do on theirs.
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS alerts_page_idx ON public.alerts (page_id);
CREATE INDEX IF NOT EXISTS reports_page_idx ON public.accident_reports (page_id);
CREATE INDEX IF NOT EXISTS comments_page_idx ON public.comments (page_id);
CREATE INDEX IF NOT EXISTS news_page_idx ON public.news (page_id);

CREATE OR REPLACE FUNCTION public.owns_page(_user_id UUID, _page_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pages WHERE id = _page_id AND owner_id = _user_id);
$$;
REVOKE ALL ON FUNCTION public.owns_page(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_page(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "alerts_insert_own" ON public.alerts;
CREATE POLICY "alerts_insert_own" ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id)));

DROP POLICY IF EXISTS "reports_insert_own" ON public.accident_reports;
CREATE POLICY "reports_insert_own" ON public.accident_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id)));

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id)));

DROP POLICY IF EXISTS "news_insert" ON public.news;
CREATE POLICY "news_insert" ON public.news FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = author_id AND status IN ('draft','pending_review')
      AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id)))
    OR public.has_min_role(auth.uid(),'editor')
  );

-- ===== ANONYMOUS POSTING =====
-- The real user_id is always kept for ownership/moderation; is_anonymous only
-- changes what the public byline shows.
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- ===== FEATURED PICKS (home page + campaigns page) =====
-- One row per slot. NULL user_id/page_id means "pick randomly"; an admin can
-- pin a specific contributor or page by filling either column in.
CREATE TABLE public.featured_picks (
  slot TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.featured_picks (slot) VALUES
  ('home_profile'), ('home_page'), ('campaigns_profile'), ('campaigns_page')
ON CONFLICT (slot) DO NOTHING;

GRANT SELECT ON public.featured_picks TO anon, authenticated;
GRANT ALL ON public.featured_picks TO service_role;
ALTER TABLE public.featured_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "featured_picks_public_read" ON public.featured_picks FOR SELECT USING (true);
CREATE POLICY "featured_picks_admin_write" ON public.featured_picks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
