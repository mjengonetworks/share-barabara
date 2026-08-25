
-- ===== NEWS VIEW TRACKING (powers trending) =====
CREATE TABLE public.news_views (
  id BIGSERIAL PRIMARY KEY,
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX news_views_news_time_idx ON public.news_views (news_id, created_at DESC);
CREATE INDEX news_views_time_idx ON public.news_views (created_at DESC);
GRANT INSERT ON public.news_views TO anon, authenticated;
GRANT ALL ON public.news_views TO service_role;
ALTER TABLE public.news_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_views_insert" ON public.news_views FOR INSERT WITH CHECK (true);
CREATE POLICY "news_views_read_editor" ON public.news_views FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));

CREATE OR REPLACE FUNCTION public.trending_news(hours_back INT DEFAULT 8, result_limit INT DEFAULT 3)
RETURNS SETOF public.news LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.* FROM public.news n
  JOIN (
    SELECT news_id, count(*) AS views
    FROM public.news_views
    WHERE created_at > now() - (hours_back || ' hours')::interval
    GROUP BY news_id
    ORDER BY count(*) DESC
    LIMIT result_limit
  ) t ON t.news_id = n.id
  WHERE n.status = 'published'
  ORDER BY t.views DESC;
$$;
REVOKE ALL ON FUNCTION public.trending_news(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trending_news(int,int) TO anon, authenticated;
