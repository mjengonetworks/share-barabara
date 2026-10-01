-- TASK 50 REVIEW-ONLY MIGRATION
-- Do not execute until the existing review migrations are applied and the
-- live policies/functions have been inspected. This keeps user/admin deletion
-- separate from moderation removal: moderation remains in its existing audit
-- workflow and is never restorable through a recycle bin.

CREATE TABLE IF NOT EXISTS public.recycle_bin_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN (
    'alert', 'report', 'article', 'feed_post', 'comment', 'video',
    'infrastructure_issue', 'campaign', 'page'
  )),
  content_id UUID NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deletion_origin TEXT NOT NULL CHECK (deletion_origin IN ('user', 'admin')),
  deletion_reason TEXT,
  snapshot JSONB NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'deleted'
    CHECK (status IN ('deleted', 'restored', 'permanently_deleted')),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purge_after TIMESTAMPTZ,
  restored_at TIMESTAMPTZ,
  restored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  permanently_deleted_at TIMESTAMPTZ,
  permanently_deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recycle_bin_active_item_unique UNIQUE (content_type, content_id, status)
    DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS recycle_bin_owner_idx
  ON public.recycle_bin_items (owner_id, deleted_at DESC)
  WHERE status = 'deleted' AND deletion_origin = 'user';
CREATE INDEX IF NOT EXISTS recycle_bin_admin_idx
  ON public.recycle_bin_items (deleted_at DESC, content_type)
  WHERE status = 'deleted' AND deletion_origin = 'admin';

CREATE TABLE IF NOT EXISTS public.recycle_bin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recycle_bin_item_id UUID NOT NULL REFERENCES public.recycle_bin_items(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('deleted', 'restored', 'permanently_deleted')),
  reason TEXT,
  previous_state JSONB,
  new_state JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recycle_bin_history_item_idx
  ON public.recycle_bin_history (recycle_bin_item_id, created_at DESC);

ALTER TABLE public.recycle_bin_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recycle_bin_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recycle_bin_items, public.recycle_bin_history FROM anon;
GRANT SELECT ON public.recycle_bin_items TO authenticated;
GRANT SELECT ON public.recycle_bin_history TO authenticated;
GRANT ALL ON public.recycle_bin_items, public.recycle_bin_history TO service_role;

DROP POLICY IF EXISTS recycle_bin_owner_or_admin_read ON public.recycle_bin_items;
CREATE POLICY recycle_bin_owner_or_admin_read ON public.recycle_bin_items
  FOR SELECT TO authenticated
  USING (
    (deletion_origin = 'user' AND owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS recycle_bin_admin_history_read ON public.recycle_bin_history;
CREATE POLICY recycle_bin_admin_history_read ON public.recycle_bin_history
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- All eligible source records retain their original row and relationships.
-- These columns are deliberately independent of moderation_status.
ALTER TABLE IF EXISTS public.alerts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.accident_reports
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.news
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.videos
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.infrastructure_issues
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.campaigns
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.feed_posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;
ALTER TABLE IF EXISTS public.pages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_origin TEXT;

CREATE INDEX IF NOT EXISTS alerts_deleted_idx ON public.alerts (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS reports_deleted_idx ON public.accident_reports (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS news_deleted_idx ON public.news (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS comments_deleted_idx ON public.comments (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS videos_deleted_idx ON public.videos (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS infrastructure_deleted_idx ON public.infrastructure_issues (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS campaigns_deleted_idx ON public.campaigns (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS feed_posts_deleted_idx ON public.feed_posts (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS pages_deleted_idx ON public.pages (deleted_at) WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.recycle_bin_source(
  _content_type TEXT,
  _content_id UUID,
  OUT _snapshot JSONB,
  OUT _owner_id UUID,
  OUT _title TEXT
)
RETURNS RECORD LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  CASE _content_type
    WHEN 'alert' THEN SELECT to_jsonb(x), x.user_id, x.title INTO _snapshot, _owner_id, _title FROM public.alerts x WHERE x.id = _content_id;
    WHEN 'report' THEN SELECT to_jsonb(x), x.user_id, x.title INTO _snapshot, _owner_id, _title FROM public.accident_reports x WHERE x.id = _content_id;
    WHEN 'article' THEN SELECT to_jsonb(x), x.author_id, x.title INTO _snapshot, _owner_id, _title FROM public.news x WHERE x.id = _content_id;
    WHEN 'feed_post' THEN SELECT to_jsonb(x), x.author_id, left(x.body, 120) INTO _snapshot, _owner_id, _title FROM public.feed_posts x WHERE x.id = _content_id;
    WHEN 'comment' THEN SELECT to_jsonb(x), x.user_id, left(x.body, 120) INTO _snapshot, _owner_id, _title FROM public.comments x WHERE x.id = _content_id;
    WHEN 'video' THEN SELECT to_jsonb(x), x.user_id, x.title INTO _snapshot, _owner_id, _title FROM public.videos x WHERE x.id = _content_id;
    WHEN 'infrastructure_issue' THEN SELECT to_jsonb(x), x.user_id, x.title INTO _snapshot, _owner_id, _title FROM public.infrastructure_issues x WHERE x.id = _content_id;
    WHEN 'campaign' THEN SELECT to_jsonb(x), x.created_by, x.title INTO _snapshot, _owner_id, _title FROM public.campaigns x WHERE x.id = _content_id;
    WHEN 'page' THEN SELECT to_jsonb(x), x.owner_id, x.name INTO _snapshot, _owner_id, _title FROM public.pages x WHERE x.id = _content_id;
    ELSE RAISE EXCEPTION 'Unsupported recycle-bin content type';
  END CASE;
  IF _snapshot IS NULL THEN RAISE EXCEPTION 'Content not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.recycle_bin_source(TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recycle_bin_mark_source(
  _content_type TEXT, _content_id UUID, _actor UUID, _origin TEXT, _reason TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  CASE _content_type
    WHEN 'alert' THEN UPDATE public.alerts SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'report' THEN UPDATE public.accident_reports SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'article' THEN UPDATE public.news SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'feed_post' THEN UPDATE public.feed_posts SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'comment' THEN UPDATE public.comments SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'video' THEN UPDATE public.videos SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'infrastructure_issue' THEN UPDATE public.infrastructure_issues SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'campaign' THEN UPDATE public.campaigns SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
    WHEN 'page' THEN UPDATE public.pages SET deleted_at = now(), deleted_by = _actor, deletion_origin = _origin WHERE id = _content_id;
  END CASE;
END;
$$;
REVOKE ALL ON FUNCTION public.recycle_bin_mark_source(TEXT, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recycle_bin_delete(
  _content_type TEXT, _content_id UUID, _reason TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s JSONB; owner UUID; title TEXT; item UUID; origin TEXT; actor UUID := auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT _snapshot, _owner_id, _title INTO s, owner, title FROM public.recycle_bin_source(_content_type, _content_id);
  IF EXISTS (SELECT 1 FROM public.recycle_bin_items WHERE content_type = _content_type AND content_id = _content_id AND status = 'deleted') THEN
    RAISE EXCEPTION 'Content is already in the recycle bin';
  END IF;
  IF public.has_role(actor, 'admin') THEN origin := 'admin';
  ELSIF owner = actor THEN origin := 'user';
  ELSE RAISE EXCEPTION 'You may only delete your own content'; END IF;
  INSERT INTO public.recycle_bin_items(content_type, content_id, owner_id, deleted_by, deletion_origin, deletion_reason, snapshot, title, purge_after)
    VALUES (_content_type, _content_id, owner, actor, origin, NULLIF(btrim(_reason), ''), s, title, now() + interval '30 days') RETURNING id INTO item;
  PERFORM public.recycle_bin_mark_source(_content_type, _content_id, actor, origin, _reason);
  INSERT INTO public.recycle_bin_history(recycle_bin_item_id, actor_id, action, reason, previous_state, new_state)
    VALUES (item, actor, 'deleted', _reason, jsonb_build_object('deleted_at', NULL), jsonb_build_object('origin', origin));
  RETURN item;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recycle_bin_delete(TEXT, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.recycle_bin_restore(_item_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.recycle_bin_items; actor UUID := auth.uid();
BEGIN
  SELECT * INTO item FROM public.recycle_bin_items WHERE id = _item_id AND status = 'deleted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Recycle-bin item not found'; END IF;
  IF item.deletion_origin <> 'user' OR item.owner_id IS DISTINCT FROM actor THEN
    IF NOT public.has_role(actor, 'admin') THEN RAISE EXCEPTION 'Only the owner may restore this item'; END IF;
  END IF;
  CASE item.content_type
    WHEN 'alert' THEN UPDATE public.alerts SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'report' THEN UPDATE public.accident_reports SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'article' THEN UPDATE public.news SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'feed_post' THEN UPDATE public.feed_posts SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'comment' THEN UPDATE public.comments SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'video' THEN UPDATE public.videos SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'infrastructure_issue' THEN UPDATE public.infrastructure_issues SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'campaign' THEN UPDATE public.campaigns SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
    WHEN 'page' THEN UPDATE public.pages SET deleted_at = NULL, deleted_by = NULL, deletion_origin = NULL WHERE id = item.content_id;
  END CASE;
  UPDATE public.recycle_bin_items SET status = 'restored', restored_at = now(), restored_by = actor WHERE id = _item_id;
  INSERT INTO public.recycle_bin_history(recycle_bin_item_id, actor_id, action, previous_state, new_state)
    VALUES (_item_id, actor, 'restored', jsonb_build_object('status', 'deleted'), jsonb_build_object('status', 'restored'));
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recycle_bin_restore(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.recycle_bin_permanently_delete(_item_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item public.recycle_bin_items; actor UUID := auth.uid(); children BIGINT;
BEGIN
  SELECT * INTO item FROM public.recycle_bin_items WHERE id = _item_id AND status = 'deleted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Recycle-bin item not found'; END IF;
  IF NOT (item.owner_id IS NOT DISTINCT FROM actor AND item.deletion_origin = 'user') AND NOT public.has_role(actor, 'admin') THEN
    RAISE EXCEPTION 'Not authorized to permanently delete this item';
  END IF;
  IF item.content_type = 'comment' THEN
    SELECT count(*) INTO children FROM public.comments WHERE parent_comment_id = item.content_id AND deleted_at IS NULL;
    IF children > 0 THEN RAISE EXCEPTION 'Restore or remove replies before permanently deleting this comment'; END IF;
  END IF;
  CASE item.content_type
    WHEN 'alert' THEN DELETE FROM public.alerts WHERE id = item.content_id;
    WHEN 'report' THEN DELETE FROM public.accident_reports WHERE id = item.content_id;
    WHEN 'article' THEN DELETE FROM public.news WHERE id = item.content_id;
    WHEN 'feed_post' THEN DELETE FROM public.feed_posts WHERE id = item.content_id;
    WHEN 'comment' THEN DELETE FROM public.comments WHERE id = item.content_id;
    WHEN 'video' THEN DELETE FROM public.videos WHERE id = item.content_id;
    WHEN 'infrastructure_issue' THEN DELETE FROM public.infrastructure_issues WHERE id = item.content_id;
    WHEN 'campaign' THEN DELETE FROM public.campaigns WHERE id = item.content_id;
    WHEN 'page' THEN DELETE FROM public.pages WHERE id = item.content_id;
  END CASE;
  UPDATE public.recycle_bin_items SET status = 'permanently_deleted', permanently_deleted_at = now(), permanently_deleted_by = actor WHERE id = _item_id;
  INSERT INTO public.recycle_bin_history(recycle_bin_item_id, actor_id, action, previous_state, new_state)
    VALUES (_item_id, actor, 'permanently_deleted', jsonb_build_object('status', 'deleted'), jsonb_build_object('status', 'permanently_deleted'));
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.recycle_bin_permanently_delete(UUID) TO authenticated;

-- Replace permissive public policies so soft-deleted rows cannot appear in
-- public search, profiles, Feed, trending queries or notifications.
DROP POLICY IF EXISTS news_public_read ON public.news;
DROP POLICY IF EXISTS news_public_read_published ON public.news;
CREATE POLICY news_public_read_published ON public.news FOR SELECT
  USING (deleted_at IS NULL AND status = 'published');
DROP POLICY IF EXISTS alerts_public_read ON public.alerts;
DROP POLICY IF EXISTS alerts_public_read_active ON public.alerts;
CREATE POLICY alerts_public_read_active ON public.alerts FOR SELECT
  USING (deleted_at IS NULL AND status = 'active');
DROP POLICY IF EXISTS reports_public_read ON public.accident_reports;
DROP POLICY IF EXISTS reports_read_approved ON public.accident_reports;
CREATE POLICY reports_read_approved ON public.accident_reports FOR SELECT
  USING (deleted_at IS NULL AND (status = 'approved' OR auth.uid() = user_id OR public.has_min_role(auth.uid(), 'moderator')));
DROP POLICY IF EXISTS comments_public_read ON public.comments;
DROP POLICY IF EXISTS comments_public_read_active ON public.comments;
CREATE POLICY comments_public_read_active ON public.comments FOR SELECT
  USING (deleted_at IS NULL AND moderation_status = 'published');
DROP POLICY IF EXISTS videos_read ON public.videos;
CREATE POLICY videos_read ON public.videos FOR SELECT
  USING (deleted_at IS NULL AND (status = 'featured' OR auth.uid() = user_id OR public.has_min_role(auth.uid(), 'moderator')));
DROP POLICY IF EXISTS infrastructure_issues_read ON public.infrastructure_issues;
CREATE POLICY infrastructure_issues_read ON public.infrastructure_issues FOR SELECT
  USING (deleted_at IS NULL AND (status = 'approved' OR auth.uid() = user_id OR public.has_min_role(auth.uid(), 'moderator')));
DROP POLICY IF EXISTS campaigns_public_read ON public.campaigns;
CREATE POLICY campaigns_public_read ON public.campaigns FOR SELECT
  USING (deleted_at IS NULL AND (end_date >= CURRENT_DATE OR report_published OR public.has_min_role(auth.uid(), 'editor')));
DROP POLICY IF EXISTS pages_public_read ON public.pages;
CREATE POLICY pages_public_read ON public.pages FOR SELECT
  USING (deleted_at IS NULL);
DROP POLICY IF EXISTS feed_posts_public_published_read ON public.feed_posts;
CREATE POLICY feed_posts_public_published_read ON public.feed_posts FOR SELECT
  USING (deleted_at IS NULL AND (status = 'published' OR public.has_min_role(auth.uid(), 'moderator')));
