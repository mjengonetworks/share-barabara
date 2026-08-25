-- Only subscribed profiles or verified (premium) pages may write articles.
-- Editors/admins are unaffected (they publish through the review queue
-- regardless of subscription status).
DROP POLICY "news_insert" ON public.news;
CREATE POLICY "news_insert" ON public.news FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = author_id
      AND status = ANY (ARRAY['draft', 'pending_review'])
      AND (
        (page_id IS NULL AND public.has_active_subscription(auth.uid()))
        OR (
          page_id IS NOT NULL
          AND public.owns_page(auth.uid(), page_id)
          AND EXISTS (SELECT 1 FROM public.pages WHERE id = page_id AND verified)
        )
      )
    )
    OR public.has_min_role(auth.uid(), 'editor')
  );
