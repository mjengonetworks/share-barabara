-- REVIEW ONLY: additive relationship support for multiple canonical roads per
-- editorial record. Do not apply to production without owner approval.
-- Existing singular road_id columns remain authoritative until this migration
-- and the corresponding UI rollout are approved together.
CREATE TABLE IF NOT EXISTS public.news_roads (
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  road_id UUID NOT NULL REFERENCES public.roads(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (news_id, road_id)
);
CREATE TABLE IF NOT EXISTS public.alert_roads (
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  road_id UUID NOT NULL REFERENCES public.roads(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, road_id)
);
CREATE TABLE IF NOT EXISTS public.accident_report_roads (
  report_id UUID NOT NULL REFERENCES public.accident_reports(id) ON DELETE CASCADE,
  road_id UUID NOT NULL REFERENCES public.roads(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, road_id)
);
CREATE TABLE IF NOT EXISTS public.infrastructure_issue_roads (
  issue_id UUID NOT NULL REFERENCES public.infrastructure_issues(id) ON DELETE CASCADE,
  road_id UUID NOT NULL REFERENCES public.roads(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, road_id)
);

CREATE INDEX IF NOT EXISTS news_roads_road_idx ON public.news_roads (road_id);
CREATE INDEX IF NOT EXISTS alert_roads_road_idx ON public.alert_roads (road_id);
CREATE INDEX IF NOT EXISTS accident_report_roads_road_idx ON public.accident_report_roads (road_id);
CREATE INDEX IF NOT EXISTS infrastructure_issue_roads_road_idx ON public.infrastructure_issue_roads (road_id);

ALTER TABLE public.news_roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accident_report_roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infrastructure_issue_roads ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.news_roads, public.alert_roads, public.accident_report_roads,
  public.infrastructure_issue_roads TO anon, authenticated;
GRANT INSERT, DELETE ON public.news_roads, public.alert_roads, public.accident_report_roads,
  public.infrastructure_issue_roads TO authenticated;

-- Public association reads are limited to records that are already eligible on
-- their source table. Association writes remain editor-only and cannot attach
-- unpublished, deleted or rejected content to a public road.
CREATE POLICY news_roads_public_read_eligible ON public.news_roads
  FOR SELECT TO public USING (EXISTS (
    SELECT 1 FROM public.news n
    WHERE n.id = news_id AND n.status = 'published' AND n.deleted_at IS NULL
  ));
CREATE POLICY news_roads_editor_insert ON public.news_roads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor') AND EXISTS (
    SELECT 1 FROM public.news n
    WHERE n.id = news_id AND n.status = 'published' AND n.deleted_at IS NULL
  ));
CREATE POLICY news_roads_editor_delete ON public.news_roads
  FOR DELETE TO authenticated USING (public.has_min_role(auth.uid(), 'editor'));

CREATE POLICY alert_roads_public_read_eligible ON public.alert_roads
  FOR SELECT TO public USING (EXISTS (
    SELECT 1 FROM public.alerts a
    WHERE a.id = alert_id AND a.deleted_at IS NULL
      AND (a.status IS NULL OR a.status IN ('active','in_progress','under_resolution','resolved'))
  ));
CREATE POLICY alert_roads_editor_insert ON public.alert_roads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor') AND EXISTS (
    SELECT 1 FROM public.alerts a
    WHERE a.id = alert_id AND a.deleted_at IS NULL
      AND (a.status IS NULL OR a.status IN ('active','in_progress','under_resolution','resolved'))
  ));
CREATE POLICY alert_roads_editor_delete ON public.alert_roads
  FOR DELETE TO authenticated USING (public.has_min_role(auth.uid(), 'editor'));

CREATE POLICY accident_report_roads_public_read_eligible ON public.accident_report_roads
  FOR SELECT TO public USING (EXISTS (
    SELECT 1 FROM public.accident_reports r
    WHERE r.id = report_id AND r.status = 'approved'
      AND r.deleted_at IS NULL AND r.duplicate_of_report_id IS NULL
  ));
CREATE POLICY accident_report_roads_editor_insert ON public.accident_report_roads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor') AND EXISTS (
    SELECT 1 FROM public.accident_reports r
    WHERE r.id = report_id AND r.status = 'approved'
      AND r.deleted_at IS NULL AND r.duplicate_of_report_id IS NULL
  ));
CREATE POLICY accident_report_roads_editor_delete ON public.accident_report_roads
  FOR DELETE TO authenticated USING (public.has_min_role(auth.uid(), 'editor'));

CREATE POLICY infrastructure_issue_roads_public_read_eligible ON public.infrastructure_issue_roads
  FOR SELECT TO public USING (EXISTS (
    SELECT 1 FROM public.infrastructure_issues i
    WHERE i.id = issue_id AND i.status = 'approved' AND i.deleted_at IS NULL
  ));
CREATE POLICY infrastructure_issue_roads_editor_insert ON public.infrastructure_issue_roads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'editor') AND EXISTS (
    SELECT 1 FROM public.infrastructure_issues i
    WHERE i.id = issue_id AND i.status = 'approved' AND i.deleted_at IS NULL
  ));
CREATE POLICY infrastructure_issue_roads_editor_delete ON public.infrastructure_issue_roads
  FOR DELETE TO authenticated USING (public.has_min_role(auth.uid(), 'editor'));
