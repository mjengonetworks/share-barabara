-- REVIEW ONLY: Task 44 Complete Notification Customization.
-- Do not execute until Tasks 27 and 43 migrations, RLS, browser behavior, and
-- live notification delivery have been reviewed and verified.
-- This migration is intentionally ordered after the Task 27 and Task 43 review
-- migrations. It extends their single owner-scoped preference row; it does not
-- create a second notification-preference system.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean,
  ADD COLUMN IF NOT EXISTS browser_enabled boolean,
  ADD COLUMN IF NOT EXISTS email_enabled boolean,
  ADD COLUMN IF NOT EXISTS push_enabled boolean,
  ADD COLUMN IF NOT EXISTS community_enabled boolean,
  ADD COLUMN IF NOT EXISTS account_enabled boolean,
  ADD COLUMN IF NOT EXISTS excluded_hazard_types text[];

-- Existing users retain the behavior they already had. Newly introduced
-- theft/vandalism notifications are opt-in by default until the user selects
-- them, while existing hazard selections remain untouched.
UPDATE public.notification_preferences
SET notifications_enabled = COALESCE(notifications_enabled, true),
    browser_enabled = COALESCE(browser_enabled, true),
    email_enabled = COALESCE(email_enabled, false),
    push_enabled = COALESCE(push_enabled, false),
    community_enabled = COALESCE(community_enabled, interactions),
    account_enabled = COALESCE(account_enabled, true),
    excluded_hazard_types = COALESCE(excluded_hazard_types, ARRAY['theft', 'vandalism']::text[]);

ALTER TABLE public.notification_preferences
  ALTER COLUMN notifications_enabled SET DEFAULT true,
  ALTER COLUMN notifications_enabled SET NOT NULL,
  ALTER COLUMN browser_enabled SET DEFAULT true,
  ALTER COLUMN browser_enabled SET NOT NULL,
  ALTER COLUMN email_enabled SET DEFAULT false,
  ALTER COLUMN email_enabled SET NOT NULL,
  ALTER COLUMN push_enabled SET DEFAULT false,
  ALTER COLUMN push_enabled SET NOT NULL,
  ALTER COLUMN community_enabled SET DEFAULT true,
  ALTER COLUMN community_enabled SET NOT NULL,
  ALTER COLUMN account_enabled SET DEFAULT true,
  ALTER COLUMN account_enabled SET NOT NULL,
  ALTER COLUMN excluded_hazard_types SET DEFAULT ARRAY['theft', 'vandalism']::text[],
  ALTER COLUMN excluded_hazard_types SET NOT NULL;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_exclusion_values
    CHECK (
      array_position(excluded_hazard_types, NULL::text) IS NULL
      AND '' <> ALL(excluded_hazard_types)
    );

CREATE INDEX IF NOT EXISTS notification_preferences_excluded_hazards_gin_idx
  ON public.notification_preferences USING gin (excluded_hazard_types);

COMMENT ON COLUMN public.notification_preferences.notifications_enabled IS
  'Master server-side notification switch for all supported event groups.';
COMMENT ON COLUMN public.notification_preferences.browser_enabled IS
  'Allows foreground browser Notification objects when browser permission is granted; this is not background push.';
COMMENT ON COLUMN public.notification_preferences.email_enabled IS
  'Reserved for a future verified email delivery provider; currently no email is sent.';
COMMENT ON COLUMN public.notification_preferences.push_enabled IS
  'Reserved for a future service-worker push provider; currently no background push is sent.';
COMMENT ON COLUMN public.notification_preferences.excluded_hazard_types IS
  'Explicit taxonomy exclusions. Exclusions always win over parent or unrestricted selections.';

-- Parent selection includes active descendants. A subtype-only selection does
-- not include siblings. Missing taxonomy values never bypass a restriction.
CREATE OR REPLACE FUNCTION public.notification_hazard_type_matches(
  p_hazard_type text,
  p_selected text[],
  p_excluded text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE selected(value) AS (
    SELECT value FROM unnest(COALESCE(p_selected, '{}'::text[])) AS value
  ),
  included(value) AS (
    SELECT value FROM selected
    UNION
    SELECT child.value
    FROM public.hazard_types child
    JOIN included parent ON child.parent_value = parent.value
    WHERE child.active IS NOT FALSE
  ),
  excluded(value) AS (
    SELECT value FROM unnest(COALESCE(p_excluded, '{}'::text[])) AS value
    UNION
    SELECT child.value
    FROM public.hazard_types child
    JOIN excluded parent ON child.parent_value = parent.value
    WHERE child.active IS NOT FALSE
  )
  SELECT p_hazard_type IS NOT NULL
    AND (cardinality(COALESCE(p_selected, '{}'::text[])) = 0
         OR EXISTS (SELECT 1 FROM included WHERE value = p_hazard_type))
    AND NOT EXISTS (SELECT 1 FROM excluded WHERE value = p_hazard_type);
$$;
REVOKE ALL ON FUNCTION public.notification_hazard_type_matches(text, text[], text[]) FROM PUBLIC, anon, authenticated;

-- Alert delivery remains active/public-only and is still generated server-side.
-- Geography is OR (radius, county, or road); severity and taxonomy are AND
-- filters. Empty geography matches nobody. Empty selected taxonomy means all
-- taxonomy values except explicit exclusions.
CREATE OR REPLACE FUNCTION public.notify_nearby_users_on_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  preference record;
  distance_km double precision;
  radius_match boolean;
  county_match boolean;
  road_match boolean;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;

  FOR preference IN
    SELECT * FROM public.notification_preferences
    WHERE notifications_enabled = true
      AND alerts = true
      AND in_app_enabled = true
      AND (mute_until IS NULL OR mute_until <= now())
      AND user_id <> NEW.user_id
  LOOP
    radius_match := false;
    IF preference.radius_enabled
       AND preference.latitude IS NOT NULL AND preference.longitude IS NOT NULL
       AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
      distance_km := 6371 * 2 * asin(sqrt(least(1, greatest(0,
        sin(radians(NEW.latitude - preference.latitude) / 2) ^ 2
        + cos(radians(preference.latitude)) * cos(radians(NEW.latitude))
        * sin(radians(NEW.longitude - preference.longitude) / 2) ^ 2
      ))));
      radius_match := distance_km <= preference.radius_km;
    END IF;
    county_match := cardinality(preference.county_filters) > 0
      AND NEW.county = ANY(preference.county_filters);
    road_match := NEW.road_id IS NOT NULL
      AND cardinality(preference.road_ids) > 0
      AND NEW.road_id = ANY(preference.road_ids);

    IF (radius_match OR county_match OR road_match)
       AND (cardinality(preference.severities) = 0 OR NEW.severity = ANY(preference.severities))
       AND public.notification_hazard_type_matches(
         NEW.hazard_type, preference.hazard_types, preference.excluded_hazard_types
       ) THEN
      INSERT INTO public.notifications
        (user_id, type, title, body, link, source_type, source_id, dedupe_key)
      VALUES
        (preference.user_id, 'nearby_alert', 'Nearby hazard alert', NEW.title,
         '/alerts/' || NEW.id, 'alert', NEW.id, 'alert:' || NEW.id || ':nearby')
      ON CONFLICT (user_id, dedupe_key)
        WHERE dedupe_key IS NOT NULL DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Existing notification events are grouped without inventing new event types:
-- vote/reply = community, submission status = account, nearby_alert = alerts.
-- All writes remain SECURITY DEFINER and recipients are taken from the source
-- row, never from client input.
CREATE OR REPLACE FUNCTION public.notify_on_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID; entity_title TEXT;
BEGIN
  IF NEW.value <> 1 OR (TG_OP = 'UPDATE' AND OLD.value = 1) THEN RETURN NEW; END IF;
  IF NEW.entity_type = 'alert' THEN
    SELECT user_id, title INTO owner, entity_title FROM public.alerts WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'report' THEN
    SELECT user_id, title INTO owner, entity_title FROM public.accident_reports WHERE id = NEW.entity_id;
  ELSIF NEW.entity_type = 'comment' THEN
    SELECT user_id, left(body,60) INTO owner, entity_title FROM public.comments WHERE id = NEW.entity_id;
  END IF;
  IF owner IS NULL OR owner = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, source_type, source_id, dedupe_key)
  SELECT owner, 'upvote', 'Someone upvoted your ' || NEW.entity_type, entity_title,
         'vote', NEW.entity_id, 'vote:' || NEW.entity_type || ':' || NEW.entity_id || ':' || NEW.user_id
  WHERE COALESCE((SELECT notifications_enabled AND community_enabled AND in_app_enabled
                  FROM public.notification_preferences WHERE user_id = owner), true)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE parent_owner UUID;
BEGIN
  IF NEW.parent_comment_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO parent_owner FROM public.comments WHERE id = NEW.parent_comment_id;
  IF parent_owner IS NULL OR parent_owner = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, source_type, source_id, dedupe_key)
  SELECT parent_owner, 'comment_reply', 'Someone replied to your comment', left(NEW.body,80),
         'comment', NEW.id, 'reply:' || NEW.id
  WHERE COALESCE((SELECT notifications_enabled AND community_enabled AND in_app_enabled
                  FROM public.notification_preferences WHERE user_id = parent_owner), true)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_report_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    INSERT INTO public.notifications (user_id, type, title, body, source_type, source_id, dedupe_key)
    SELECT NEW.user_id, 'report_status', 'Your accident report was ' || NEW.status, NEW.title,
           'report', NEW.id, 'report-status:' || NEW.id || ':' || NEW.status
    WHERE COALESCE((SELECT notifications_enabled AND account_enabled AND reports AND in_app_enabled
                    FROM public.notification_preferences WHERE user_id = NEW.user_id), true)
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_article_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('published','rejected') AND NEW.author_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, source_type, source_id, dedupe_key)
    SELECT NEW.author_id, 'article_status', 'Your article was ' || NEW.status, NEW.title,
           'article', NEW.id, 'article-status:' || NEW.id || ':' || NEW.status
    WHERE COALESCE((SELECT notifications_enabled AND account_enabled AND articles AND in_app_enabled
                    FROM public.notification_preferences WHERE user_id = NEW.author_id), true)
    ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.notification_preferences IS
  'One private owner-scoped row for alert, community, and account notification rules. Email/push fields are reserved until delivery infrastructure exists.';
