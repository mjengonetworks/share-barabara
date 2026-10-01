-- TASK 46 REVIEW-ONLY MIGRATION
-- Do not execute until the Feed schema, RLS, moderation workflow and live UI
-- have been reviewed together. Existing Articles, Alerts, Reports, comments
-- and votes remain the authoritative records for those content types.

CREATE TABLE IF NOT EXISTS public.feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 3 AND 4000),
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','removed','hidden')),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','approved','rejected','needs_review')),
  moderation_reason TEXT,
  moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feed_posts_public_idx ON public.feed_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS feed_posts_author_idx ON public.feed_posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feed_posts_hashtags_idx ON public.feed_posts USING GIN (hashtags);

CREATE TABLE IF NOT EXISTS public.feed_post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS feed_post_reports_queue_idx ON public.feed_post_reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.feed_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

GRANT SELECT ON public.feed_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_posts TO authenticated;
GRANT SELECT, INSERT ON public.feed_post_reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.feed_blocks TO authenticated;
GRANT ALL ON public.feed_posts, public.feed_post_reports, public.feed_blocks TO service_role;

ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feed_posts_public_published_read" ON public.feed_posts FOR SELECT
  USING (status = 'published' OR author_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'));
CREATE POLICY "feed_posts_insert_own_pending" ON public.feed_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND status = 'pending' AND moderation_status = 'pending');
CREATE POLICY "feed_posts_update_own_unpublished" ON public.feed_posts FOR UPDATE TO authenticated
  USING ((author_id = auth.uid() AND status = 'pending') OR public.has_min_role(auth.uid(), 'moderator'))
  WITH CHECK ((author_id = auth.uid() AND status = 'pending') OR public.has_min_role(auth.uid(), 'moderator'));
CREATE POLICY "feed_posts_delete_own_or_moderator" ON public.feed_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'));

CREATE POLICY "feed_post_reports_own_read" ON public.feed_post_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_min_role(auth.uid(), 'moderator'));
CREATE POLICY "feed_post_reports_own_insert" ON public.feed_post_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "feed_post_reports_moderator_update" ON public.feed_post_reports FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'moderator')) WITH CHECK (public.has_min_role(auth.uid(), 'moderator'));

CREATE POLICY "feed_blocks_own_read" ON public.feed_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());
CREATE POLICY "feed_blocks_own_insert" ON public.feed_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "feed_blocks_own_delete" ON public.feed_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_feed_post_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER feed_posts_touch BEFORE UPDATE ON public.feed_posts
FOR EACH ROW EXECUTE FUNCTION public.touch_feed_post_updated_at();

-- Reuse the existing votes table instead of creating a parallel voting system.
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_entity_type_check;
ALTER TABLE public.votes ADD CONSTRAINT votes_entity_type_check
  CHECK (entity_type IN ('alert','report','comment','feed_post'));

-- Comments already provide threaded replies. This trigger makes a new top-level
-- Feed discussion visible through the existing notification architecture.
CREATE OR REPLACE FUNCTION public.notify_on_feed_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_owner UUID;
BEGIN
  IF NEW.entity_type <> 'feed_post' THEN RETURN NEW; END IF;
  SELECT author_id INTO post_owner FROM public.feed_posts WHERE id = NEW.entity_id;
  IF post_owner IS NULL OR post_owner = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, source_type, source_id, dedupe_key)
  VALUES (post_owner, 'comment_reply', 'Someone joined your Feed discussion', left(NEW.body, 80), 'feed_post', NEW.entity_id, 'feed-comment:' || NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS feed_comment_notification ON public.comments;
CREATE TRIGGER feed_comment_notification AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_feed_comment();
REVOKE ALL ON FUNCTION public.notify_on_feed_comment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_on_feed_comment() TO service_role;

-- Extend the existing vote notification trigger for Feed posts without
-- creating a second voting or notification system. Task 44 preference fields
-- are deliberately checked for community events.
CREATE OR REPLACE FUNCTION public.notify_on_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; entity_title TEXT; entity_link TEXT;
BEGIN
  IF NEW.value <> 1 OR (TG_OP = 'UPDATE' AND OLD.value = 1) THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'alert' THEN
    SELECT user_id, title, '/alerts/' || id INTO owner, entity_title, entity_link FROM public.alerts WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'report' THEN
    SELECT user_id, title, '/reports/' || id INTO owner, entity_title, entity_link FROM public.accident_reports WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'comment' THEN
    SELECT user_id, left(body,60), NULL INTO owner, entity_title, entity_link FROM public.comments WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'feed_post' THEN
    SELECT author_id, left(body,80), '/feed' INTO owner, entity_title, entity_link FROM public.feed_posts WHERE id = NEW.entity_id;
  END IF;
  IF owner IS NULL OR owner = NEW.user_id THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'feed_post' AND NOT COALESCE((SELECT notifications_enabled AND community_enabled AND in_app_enabled FROM public.notification_preferences WHERE user_id = owner), true) THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link, source_type, source_id, dedupe_key)
  VALUES (owner, 'upvote', 'Someone upvoted your ' || NEW.entity_type, entity_title, entity_link, NEW.entity_type, NEW.entity_id, 'vote:' || NEW.entity_type || ':' || NEW.entity_id || ':' || NEW.user_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
