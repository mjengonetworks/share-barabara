-- ===== ADMIN DASHBOARD: permission gaps closed =====
-- Auditing pg_policies against the write-up in ADMIN.md turned up five
-- places the RLS layer didn't yet match the intended role ladder:
--   1. user_roles had SELECT policies only — nobody, not even an admin,
--      could grant/revoke a role through the app (only via service-role
--      migrations, which is how the first admin was bootstrapped).
--   2. comments/alerts DELETE (and alerts UPDATE) stopped at "owner or
--      admin" — moderators couldn't act despite owning report moderation.
--   3. content_requests had no UPDATE policy at all, so the "recommend for
--      suspension" / edit / removal queue could be filed into but never
--      resolved.
--   4. profiles had no staff override, so nobody could act on a suspension
--      once approved.
--   5. There was no suspension state at all.

-- ----- 1. Suspension state + enforcement -----
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_suspended(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT suspended FROM public.profiles WHERE id = _user_id), false);
$$;
REVOKE ALL ON FUNCTION public.is_suspended(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_suspended(uuid) TO authenticated, service_role;

-- Editor-and-above can act on any profile (clear a bad bio, and the thing
-- this migration adds it for: flip `suspended` once a moderator's
-- recommendation is approved). Role management itself stays admin-only via
-- user_roles below, per "editors can do everything except manage roles".
CREATE POLICY "profiles_editor_update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));

-- A suspended account keeps read access and can still be signed in (so they
-- see why), it just can't create new content.
DROP POLICY IF EXISTS "alerts_insert_own" ON public.alerts;
CREATE POLICY "alerts_insert_own" ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND NOT public.is_suspended(auth.uid())
    AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id))
  );

DROP POLICY IF EXISTS "reports_insert_own" ON public.accident_reports;
CREATE POLICY "reports_insert_own" ON public.accident_reports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND NOT public.is_suspended(auth.uid())
    AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id))
  );

DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND NOT public.is_suspended(auth.uid())
    AND (page_id IS NULL OR public.owns_page(auth.uid(), page_id))
  );

DROP POLICY IF EXISTS "votes_insert_own" ON public.votes;
CREATE POLICY "votes_insert_own" ON public.votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "news_insert" ON public.news;
CREATE POLICY "news_insert" ON public.news FOR INSERT TO authenticated
  WITH CHECK (
    (
      auth.uid() = author_id AND NOT public.is_suspended(auth.uid())
      AND status = ANY (ARRAY['draft'::text, 'pending_review'::text])
      AND (
        (page_id IS NULL AND public.has_active_subscription(auth.uid()))
        OR (page_id IS NOT NULL AND public.owns_page(auth.uid(), page_id)
            AND EXISTS (SELECT 1 FROM public.pages WHERE pages.id = news.page_id AND pages.verified))
      )
    )
    OR public.has_min_role(auth.uid(),'editor')
  );

-- ----- 2. Moderators get the moderation reach the write-up describes -----
DROP POLICY IF EXISTS "comments_delete_own" ON public.comments;
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "alerts_update_own" ON public.alerts;
CREATE POLICY "alerts_update_own" ON public.alerts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'))
  WITH CHECK (auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "alerts_delete_own" ON public.alerts;
CREATE POLICY "alerts_delete_own" ON public.alerts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));

-- ----- 3. content_requests can now actually be resolved -----
-- Covers edit/removal requests (any staff can action) and the "recommend
-- this user for suspension" flow a moderator files by inserting a row with
-- entity_type='profile', request_type='suspend' — approving it is just
-- setting status here plus flipping profiles.suspended via the policy above.
CREATE POLICY "content_requests_update_staff" ON public.content_requests FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_min_role(auth.uid(),'moderator'));

-- ----- 4. user_roles: admin can finally grant/revoke through the app -----
CREATE POLICY "user_roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
