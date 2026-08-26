-- Alert view tracking (mirrors news_views / accident_report_views). Alerts
-- had zero view tracking until now.
CREATE TABLE public.alert_views (
  id BIGSERIAL PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alert_views_alert_time_idx ON public.alert_views (alert_id, created_at DESC);
CREATE INDEX alert_views_time_idx ON public.alert_views (created_at DESC);
GRANT INSERT ON public.alert_views TO anon, authenticated;
GRANT ALL ON public.alert_views TO service_role;
ALTER TABLE public.alert_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert_views_insert" ON public.alert_views FOR INSERT WITH CHECK (true);
CREATE POLICY "alert_views_read_moderator" ON public.alert_views FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'moderator'));

CREATE OR REPLACE FUNCTION public.trending_alerts(hours_back INT DEFAULT 48, result_limit INT DEFAULT 5)
RETURNS SETOF public.alerts LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.* FROM public.alerts a
  JOIN (
    SELECT alert_id, count(*) AS views
    FROM public.alert_views
    WHERE created_at > now() - (hours_back || ' hours')::interval
    GROUP BY alert_id
    ORDER BY count(*) DESC
    LIMIT result_limit
  ) t ON t.alert_id = a.id
  ORDER BY t.views DESC;
$$;
REVOKE ALL ON FUNCTION public.trending_alerts(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trending_alerts(int,int) TO anon, authenticated;
