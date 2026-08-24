
-- ===== ROLE RANK HELPERS =====
-- The role ladder is cumulative (member < guest_author < author < moderator
-- < editor < admin), each tier inheriting everything below it. role_rank()
-- turns that into a comparable integer so policies can say "author or above"
-- instead of chaining has_role() ORs for every tier.
CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role)
RETURNS SMALLINT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _role
    WHEN 'member' THEN 0
    WHEN 'guest_author' THEN 1
    WHEN 'author' THEN 2
    WHEN 'moderator' THEN 3
    WHEN 'editor' THEN 4
    WHEN 'admin' THEN 5
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(_user_id UUID, _min_role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND public.role_rank(role) >= public.role_rank(_min_role)
  );
$$;

REVOKE ALL ON FUNCTION public.role_rank(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_rank(public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_min_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_min_role(uuid, public.app_role) TO authenticated, service_role;

-- ===== ARTICLE (NEWS) SUBMISSION & REVIEW WORKFLOW =====
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Existing seeded/editorial articles were already live before this column existed.
UPDATE public.news SET status = 'published' WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS news_status_idx ON public.news (status, published_at DESC);
CREATE INDEX IF NOT EXISTS news_author_idx ON public.news (author_id);

-- Only an editor (or admin) may move an article to published/rejected, even
-- if the author owns the row and could otherwise update it (see news_update
-- policy below). RLS WITH CHECK alone can't compare against the pre-update
-- row, so the gate lives in a trigger instead.
CREATE OR REPLACE FUNCTION public.guard_news_publish()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('published','rejected')
     AND NOT public.has_min_role(auth.uid(),'editor')
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Only an editor or admin can publish or reject an article';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS news_guard_publish ON public.news;
CREATE TRIGGER news_guard_publish BEFORE UPDATE ON public.news
FOR EACH ROW EXECUTE FUNCTION public.guard_news_publish();

DROP POLICY IF EXISTS "news_public_read" ON public.news;
DROP POLICY IF EXISTS "news_admin_write" ON public.news;

-- Published articles are public; a draft/pending article is visible to its
-- author and to moderator-and-above (who staff the review queue).
CREATE POLICY "news_read" ON public.news FOR SELECT
  USING (
    status = 'published'
    OR auth.uid() = author_id
    OR public.has_min_role(auth.uid(),'moderator')
  );

-- Any signed-in user can submit a draft or pending-review article under
-- their own name; editor-and-above can write directly (including publishing
-- staff-authored content with no byline).
CREATE POLICY "news_insert" ON public.news FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = author_id AND status IN ('draft','pending_review'))
    OR public.has_min_role(auth.uid(),'editor')
  );

-- Owners below "author" rank (guest authors, plain members) lose edit access
-- the moment their article is published; author-and-above keep it, per spec.
-- Editor-and-above can always edit any article (the review/publish path).
CREATE POLICY "news_update" ON public.news FOR UPDATE TO authenticated
  USING (
    (auth.uid() = author_id AND (status <> 'published' OR public.has_min_role(auth.uid(),'author')))
    OR public.has_min_role(auth.uid(),'editor')
  )
  WITH CHECK (
    (auth.uid() = author_id AND (status <> 'published' OR public.has_min_role(auth.uid(),'author')))
    OR public.has_min_role(auth.uid(),'editor')
  );

CREATE POLICY "news_delete" ON public.news FOR DELETE TO authenticated
  USING (
    (auth.uid() = author_id AND (status <> 'published' OR public.has_min_role(auth.uid(),'author')))
    OR public.has_min_role(auth.uid(),'editor')
  );
