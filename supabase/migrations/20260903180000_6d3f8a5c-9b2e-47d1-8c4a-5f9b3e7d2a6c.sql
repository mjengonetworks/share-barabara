-- Article publish/reject/edit-others'-work is a moderator (and up) duty, same
-- bar as accident_reports review — was editor-only, locking moderators out.
DROP POLICY IF EXISTS "news_update" ON public.news;
CREATE POLICY "news_update" ON public.news FOR UPDATE TO authenticated
  USING (
    (auth.uid() = author_id AND (status <> 'published' OR public.has_min_role(auth.uid(),'author')))
    OR public.has_min_role(auth.uid(),'moderator')
  )
  WITH CHECK (
    (auth.uid() = author_id AND (status <> 'published' OR public.has_min_role(auth.uid(),'author')))
    OR public.has_min_role(auth.uid(),'moderator')
  );

DROP POLICY IF EXISTS "news_delete" ON public.news;
CREATE POLICY "news_delete" ON public.news FOR DELETE TO authenticated
  USING (
    (auth.uid() = author_id AND (status <> 'published' OR public.has_min_role(auth.uid(),'author')))
    OR public.has_min_role(auth.uid(),'moderator')
  );

DROP POLICY IF EXISTS "news_insert" ON public.news;
CREATE POLICY "news_insert" ON public.news FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = author_id AND NOT public.is_suspended(auth.uid())
      AND status = ANY (ARRAY['draft'::text, 'pending_review'::text])
      AND (
        (page_id IS NULL AND (
          public.has_active_subscription(auth.uid()) OR public.has_min_role(auth.uid(),'author')
        ))
        OR (page_id IS NOT NULL AND public.owns_page(auth.uid(), page_id)
            AND EXISTS (SELECT 1 FROM public.pages WHERE pages.id = news.page_id AND pages.verified))
      )
    )
    OR public.has_min_role(auth.uid(),'moderator')
  );
