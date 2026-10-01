-- REVIEW ONLY: Task 49 Release Blocker Remediation & Migration Hardening.
-- Do not execute until the prior review migrations have been checked against
-- the live schema and their applied status is known.

-- Comments need reversible moderation state. Existing comments remain visible
-- by default; removal is soft so authorized staff can restore a mistake.
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'comments_moderation_status_check'
      AND conrelid = 'public.comments'::regclass
  ) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_moderation_status_check
      CHECK (moderation_status IN ('published', 'removed'));
  END IF;
END $$;

DROP POLICY IF EXISTS "comments_public_read" ON public.comments;
CREATE POLICY "comments_public_read_active" ON public.comments FOR SELECT
  USING (moderation_status = 'published');
CREATE POLICY "comments_staff_read_removed" ON public.comments FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'moderator'));
CREATE POLICY "comments_update_staff_moderation" ON public.comments FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_min_role(auth.uid(), 'moderator'));

-- Append-only staff history. No authenticated insert/update/delete grant or
-- policy exists; SECURITY DEFINER audit triggers are the only application path.
CREATE TABLE IF NOT EXISTS public.moderation_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('feed_post', 'comment', 'content_request')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_history_target_idx
  ON public.moderation_action_history (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_history_staff_idx
  ON public.moderation_action_history (moderator_id, created_at DESC);
ALTER TABLE public.moderation_action_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_action_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.moderation_action_history TO authenticated;
GRANT ALL ON public.moderation_action_history TO service_role;
DROP POLICY IF EXISTS moderation_history_staff_read ON public.moderation_action_history;
CREATE POLICY moderation_history_staff_read ON public.moderation_action_history
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.prevent_comment_moderation_self_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     AND NOT public.has_min_role(auth.uid(), 'moderator') THEN
    RAISE EXCEPTION 'Only moderators may change comment moderation state';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS comments_prevent_moderation_self_edit ON public.comments;
CREATE TRIGGER comments_prevent_moderation_self_edit
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_comment_moderation_self_edit();

CREATE OR REPLACE FUNCTION public.record_moderation_history(
  p_target_type TEXT,
  p_target_id UUID,
  p_action TEXT,
  p_reason TEXT,
  p_previous JSONB,
  p_new JSONB
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.moderation_action_history
    (moderator_id, target_type, target_id, action, reason, previous_state, new_state)
  VALUES
    (auth.uid(), p_target_type, p_target_id, p_action, COALESCE(p_reason, ''),
     COALESCE(p_previous, '{}'::jsonb), COALESCE(p_new, '{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.record_moderation_history(text, uuid, text, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_moderation_history(text, uuid, text, text, jsonb, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.audit_feed_post_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason THEN
    INSERT INTO public.moderation_action_history
      (moderator_id, target_type, target_id, action, reason, previous_state, new_state)
    VALUES (
      auth.uid(), 'feed_post', NEW.id,
      CASE NEW.status
        WHEN 'published' THEN 'publish'
        WHEN 'removed' THEN 'remove'
        WHEN 'hidden' THEN 'hide'
        ELSE 'review'
      END,
      COALESCE(NEW.moderation_reason, ''),
      jsonb_build_object('status', OLD.status, 'moderation_status', OLD.moderation_status),
      jsonb_build_object('status', NEW.status, 'moderation_status', NEW.moderation_status)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS feed_posts_moderation_audit ON public.feed_posts;
CREATE TRIGGER feed_posts_moderation_audit
  AFTER UPDATE ON public.feed_posts
  FOR EACH ROW EXECUTE FUNCTION public.audit_feed_post_moderation();

CREATE OR REPLACE FUNCTION public.audit_comment_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status
     OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason THEN
    INSERT INTO public.moderation_action_history
      (moderator_id, target_type, target_id, action, reason, previous_state, new_state)
    VALUES (
      auth.uid(), 'comment', NEW.id,
      CASE NEW.moderation_status WHEN 'removed' THEN 'remove_comment' ELSE 'restore_comment' END,
      COALESCE(NEW.moderation_reason, ''),
      jsonb_build_object('moderation_status', OLD.moderation_status),
      jsonb_build_object('moderation_status', NEW.moderation_status)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS comments_moderation_audit ON public.comments;
CREATE TRIGGER comments_moderation_audit
  AFTER UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.audit_comment_moderation();

CREATE OR REPLACE FUNCTION public.audit_content_request_resolution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.moderation_action_history
      (moderator_id, target_type, target_id, action, reason, previous_state, new_state)
    VALUES (
      auth.uid(), 'content_request', NEW.id,
      CASE NEW.status WHEN 'dismissed' THEN 'dismiss_report' ELSE 'resolve_report' END,
      COALESCE(NEW.message, ''),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'entity_type', NEW.entity_type, 'entity_id', NEW.entity_id)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS content_requests_moderation_audit ON public.content_requests;
CREATE TRIGGER content_requests_moderation_audit
  AFTER UPDATE ON public.content_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_content_request_resolution();

COMMENT ON TABLE public.moderation_action_history IS
  'Append-only staff moderation decisions. Public users have no access.';

-- Enforce Feed blocking in the database, not only in the browser. Moderators
-- retain visibility so blocks cannot hide evidence from staff review.
DROP POLICY IF EXISTS "feed_posts_public_published_read" ON public.feed_posts;
CREATE POLICY "feed_posts_public_published_read" ON public.feed_posts FOR SELECT
  USING (
    (
      status = 'published'
      AND (
        auth.uid() IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.feed_blocks b
          WHERE b.blocker_id = auth.uid() AND b.blocked_id = feed_posts.author_id
        )
      )
    )
    OR author_id = auth.uid()
    OR public.has_min_role(auth.uid(), 'moderator')
  );

-- Feed notifications are created only for published posts, with current
-- community preferences and block relationships applied server-side.
CREATE OR REPLACE FUNCTION public.notify_on_feed_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE post_owner UUID;
BEGIN
  IF NEW.entity_type <> 'feed_post' THEN RETURN NEW; END IF;
  SELECT author_id INTO post_owner FROM public.feed_posts
  WHERE id = NEW.entity_id AND status = 'published';
  IF post_owner IS NULL OR post_owner = NEW.user_id THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.feed_blocks WHERE blocker_id = post_owner AND blocked_id = NEW.user_id) THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, source_type, source_id, dedupe_key)
  SELECT post_owner, 'comment_reply', 'Someone joined your Feed discussion', left(NEW.body, 80), 'feed_post', NEW.entity_id, 'feed-comment:' || NEW.id
  WHERE COALESCE((SELECT notifications_enabled AND community_enabled AND in_app_enabled FROM public.notification_preferences WHERE user_id = post_owner), true)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; entity_title TEXT; entity_link TEXT;
BEGIN
  IF NEW.value <> 1 OR (TG_OP = 'UPDATE' AND OLD.value = 1) THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'alert' THEN
    SELECT user_id, title, '/alerts/' || id INTO owner, entity_title, entity_link FROM public.alerts WHERE id = NEW.entity_id AND status = 'active';
  ELSIF NEW.entity_type = 'report' THEN
    SELECT user_id, title, '/reports/' || id INTO owner, entity_title, entity_link FROM public.accident_reports WHERE id = NEW.entity_id AND status = 'approved';
  ELSIF NEW.entity_type = 'comment' THEN
    SELECT user_id, left(body, 60), NULL INTO owner, entity_title, entity_link FROM public.comments WHERE id = NEW.entity_id AND moderation_status = 'published';
  ELSIF NEW.entity_type = 'feed_post' THEN
    SELECT author_id, left(body, 80), '/feed' INTO owner, entity_title, entity_link
    FROM public.feed_posts WHERE id = NEW.entity_id AND status = 'published';
  END IF;
  IF owner IS NULL OR owner = NEW.user_id THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'feed_post' AND EXISTS (SELECT 1 FROM public.feed_blocks WHERE blocker_id = owner AND blocked_id = NEW.user_id) THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link, source_type, source_id, dedupe_key)
  SELECT owner, 'upvote', 'Someone upvoted your ' || NEW.entity_type, entity_title, entity_link, NEW.entity_type, NEW.entity_id, 'vote:' || NEW.entity_type || ':' || NEW.entity_id || ':' || NEW.user_id
  WHERE COALESCE((SELECT notifications_enabled AND community_enabled AND in_app_enabled FROM public.notification_preferences WHERE user_id = owner), true)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parent_owner UUID; parent_status TEXT; post_status TEXT;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id, moderation_status INTO parent_owner, parent_status
  FROM public.comments WHERE id = NEW.parent_comment_id;
  IF parent_owner IS NULL OR parent_owner = NEW.user_id OR parent_status = 'removed' THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'feed_post' THEN
    SELECT status INTO post_status FROM public.feed_posts WHERE id = NEW.entity_id;
    IF post_status <> 'published' THEN RETURN NEW; END IF;
    IF EXISTS (SELECT 1 FROM public.feed_blocks WHERE blocker_id = parent_owner AND blocked_id = NEW.user_id) THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.notifications (user_id, type, title, body, source_type, source_id, dedupe_key)
  SELECT parent_owner, 'comment_reply', 'Someone replied to your comment', left(NEW.body, 80), 'comment', NEW.id, 'reply:' || NEW.id
  WHERE COALESCE((SELECT notifications_enabled AND community_enabled AND in_app_enabled FROM public.notification_preferences WHERE user_id = parent_owner), true)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;
