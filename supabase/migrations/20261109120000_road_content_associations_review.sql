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
-- Public reads must be mediated by eligible source-row queries/RPCs; editors
-- may maintain associations only through the CMS after publication rules are
-- reviewed. Policies are intentionally omitted from this proposal until the
-- production source-status/RLS contract is confirmed.
