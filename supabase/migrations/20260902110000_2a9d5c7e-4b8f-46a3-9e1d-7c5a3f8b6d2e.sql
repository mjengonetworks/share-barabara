-- ===== INFRASTRUCTURE ISSUES =====
-- Roads/bridges/drainage/signage etc. in poor condition — distinct from
-- hazard alerts (immediate danger) and accident reports (a crash that
-- happened), reviewed by moderators before appearing publicly, same as
-- accident_reports.

CREATE TABLE public.infrastructure_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  road_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  road_scope TEXT NOT NULL DEFAULT 'county' CHECK (road_scope IN ('county','national')),
  county TEXT,
  authority TEXT,
  structure_type TEXT NOT NULL DEFAULT 'road',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  editor_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX infrastructure_issues_status_idx ON public.infrastructure_issues (status, created_at DESC);
CREATE INDEX infrastructure_issues_county_idx ON public.infrastructure_issues (county);

CREATE TRIGGER infrastructure_issues_touch_updated_at BEFORE UPDATE ON public.infrastructure_issues
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.infrastructure_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "infrastructure_issues_read" ON public.infrastructure_issues FOR SELECT
  USING (
    status = 'approved' OR auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator')
  );

CREATE POLICY "infrastructure_issues_insert_own" ON public.infrastructure_issues FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND NOT public.is_suspended(auth.uid())
    AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id))
  );

CREATE POLICY "infrastructure_issues_update" ON public.infrastructure_issues FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND status <> 'approved') OR public.has_min_role(auth.uid(),'moderator')
  )
  WITH CHECK (
    (auth.uid() = user_id AND status <> 'approved') OR public.has_min_role(auth.uid(),'moderator')
  );

CREATE POLICY "infrastructure_issues_delete" ON public.infrastructure_issues FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));
