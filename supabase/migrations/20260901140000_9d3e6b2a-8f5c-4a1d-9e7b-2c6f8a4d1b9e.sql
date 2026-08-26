-- Article/report view counts now show in the admin review queue rows, which
-- moderators (not just editors) use. Widen read access to match, consistent
-- with hub_stats already being a moderator-level "managing statistics" duty.
DROP POLICY IF EXISTS "news_views_read_editor" ON public.news_views;
CREATE POLICY "news_views_read_moderator" ON public.news_views FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "accident_report_views_read_editor" ON public.accident_report_views;
CREATE POLICY "accident_report_views_read_moderator" ON public.accident_report_views FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'moderator'));
