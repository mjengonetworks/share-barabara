-- Only guest authors need a subscription to write articles; author rank and
-- above (author/moderator/editor/admin) can write without one, since staff
-- access is the whole point of those roles. Keeps the existing top-level
-- editor+ bypass (any row, any status) unchanged.
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
    OR public.has_min_role(auth.uid(),'editor')
  );
