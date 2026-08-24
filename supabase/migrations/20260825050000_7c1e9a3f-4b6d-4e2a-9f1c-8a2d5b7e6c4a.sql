
-- ===== ROADS: structured location tagging =====
CREATE TABLE public.roads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  county TEXT,
  road_class TEXT,
  authority TEXT,
  surface TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roads TO anon, authenticated;
GRANT INSERT ON public.roads TO authenticated;
GRANT ALL ON public.roads TO service_role;
ALTER TABLE public.roads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roads_public_read" ON public.roads FOR SELECT USING (true);
CREATE POLICY "roads_insert_authenticated" ON public.roads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "roads_update_editor" ON public.roads FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));

ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS road_id UUID REFERENCES public.roads(id) ON DELETE SET NULL;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS road_id UUID REFERENCES public.roads(id) ON DELETE SET NULL;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.accident_reports ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS alerts_road_idx ON public.alerts (road_id);
CREATE INDEX IF NOT EXISTS reports_road_idx ON public.accident_reports (road_id);

-- ===== VOTES: upvote/downvote on alerts, reports, comments =====
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('alert','report','comment')),
  entity_id UUID NOT NULL,
  value SMALLINT NOT NULL CHECK (value IN (-1,1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);
CREATE INDEX votes_entity_idx ON public.votes (entity_type, entity_id);
GRANT SELECT ON public.votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_public_read" ON public.votes FOR SELECT USING (true);
CREATE POLICY "votes_insert_own" ON public.votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_update_own" ON public.votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete_own" ON public.votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  articles BOOLEAN NOT NULL DEFAULT true,
  reports BOOLEAN NOT NULL DEFAULT true,
  alerts BOOLEAN NOT NULL DEFAULT true,
  interactions BOOLEAN NOT NULL DEFAULT true,
  radius_km INTEGER NOT NULL DEFAULT 20,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_prefs_own" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notify the owner of an alert/report/comment when it receives an upvote
CREATE OR REPLACE FUNCTION public.notify_on_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; entity_title TEXT;
BEGIN
  IF NEW.value <> 1 THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.value = 1 THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'alert' THEN
    SELECT user_id, title INTO owner, entity_title FROM public.alerts WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'report' THEN
    SELECT user_id, title INTO owner, entity_title FROM public.accident_reports WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'comment' THEN
    SELECT user_id, left(body,60) INTO owner, entity_title FROM public.comments WHERE id = NEW.entity_id;
  END IF;
  IF owner IS NULL OR owner = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (owner, 'upvote', 'Someone upvoted your ' || NEW.entity_type, entity_title);
  RETURN NEW;
END;
$$;
CREATE TRIGGER votes_notify AFTER INSERT OR UPDATE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_vote();

-- threaded replies on comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments (parent_comment_id);

CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parent_owner UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO parent_owner FROM public.comments WHERE id = NEW.parent_comment_id;
  IF parent_owner IS NULL OR parent_owner = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (parent_owner, 'comment_reply', 'Someone replied to your comment', left(NEW.body,80));
  RETURN NEW;
END;
$$;
CREATE TRIGGER comments_notify_reply AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reply();

-- notify nearby users (within their preferred radius) when a new alert is posted
CREATE OR REPLACE FUNCTION public.notify_nearby_users_on_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; dist DOUBLE PRECISION;
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN RETURN NEW; END IF;
  FOR r IN
    SELECT user_id, latitude, longitude, radius_km FROM public.notification_preferences
    WHERE alerts = true AND latitude IS NOT NULL AND longitude IS NOT NULL AND user_id <> NEW.user_id
  LOOP
    dist := 6371 * acos(LEAST(1, GREATEST(-1,
      cos(radians(r.latitude)) * cos(radians(NEW.latitude)) * cos(radians(NEW.longitude) - radians(r.longitude))
      + sin(radians(r.latitude)) * sin(radians(NEW.latitude))
    )));
    IF dist <= r.radius_km THEN
      INSERT INTO public.notifications (user_id, type, title, body)
      VALUES (r.user_id, 'nearby_alert', 'New hazard alert near you', NEW.title);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER alerts_notify_nearby AFTER INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.notify_nearby_users_on_alert();

-- notify submitters when their report/article is reviewed
CREATE OR REPLACE FUNCTION public.notify_on_report_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'report_status', 'Your accident report was ' || NEW.status, NEW.title);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reports_notify_status AFTER UPDATE ON public.accident_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_on_report_status();

CREATE OR REPLACE FUNCTION public.notify_on_article_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('published','rejected') AND NEW.author_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (NEW.author_id, 'article_status', 'Your article was ' || NEW.status, NEW.title);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER news_notify_status AFTER UPDATE ON public.news
FOR EACH ROW EXECUTE FUNCTION public.notify_on_article_status();

-- ===== SUBSCRIPTIONS (blue check / ad-free) =====
CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT false,
  tier TEXT NOT NULL DEFAULT 'profile',
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO anon, authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_public_read" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "subscriptions_admin_write" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'admin')) WITH CHECK (public.has_min_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND active AND (expires_at IS NULL OR expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;

-- ===== STAR RATINGS (subscribers rate contributors 1-5) =====
CREATE TABLE public.user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rater_id, rated_user_id),
  CHECK (rater_id <> rated_user_id)
);
GRANT SELECT ON public.user_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_ratings TO authenticated;
GRANT ALL ON public.user_ratings TO service_role;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings_public_read" ON public.user_ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert_subscriber" ON public.user_ratings FOR INSERT TO authenticated
  WITH CHECK (rater_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "ratings_update_subscriber" ON public.user_ratings FOR UPDATE TO authenticated
  USING (rater_id = auth.uid() AND public.has_active_subscription(auth.uid()))
  WITH CHECK (rater_id = auth.uid() AND public.has_active_subscription(auth.uid()));
CREATE POLICY "ratings_delete_own" ON public.user_ratings FOR DELETE TO authenticated USING (rater_id = auth.uid());
