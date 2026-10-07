-- REVIEW ONLY: Task 27 Alert Radius & Notification Preferences.
-- Do not execute until the RLS, trigger, and live-delivery behavior have been
-- reviewed and browser/device verification is complete.

-- Extend the existing per-user preference row rather than creating a second
-- preference system. Existing rows remain conservative: radius matching must
-- be explicitly enabled after a user saves a location.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS radius_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS county_filters text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS road_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS hazard_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS severities text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS mute_until timestamptz,
  ADD COLUMN IF NOT EXISTS in_app_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_radius_range
    CHECK (radius_km BETWEEN 1 AND 500),
  ADD CONSTRAINT notification_preferences_coordinate_pair
    CHECK (
      (latitude IS NULL AND longitude IS NULL)
      OR (
        latitude BETWEEN -90 AND 90
        AND longitude BETWEEN -180 AND 180
      )
    ),
  ADD CONSTRAINT notification_preferences_radius_requires_location
    CHECK (
      radius_enabled = false
      OR (alerts = true AND latitude IS NOT NULL AND longitude IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS notification_preferences_alert_match_idx
  ON public.notification_preferences (alerts, radius_enabled);
CREATE INDEX IF NOT EXISTS notification_preferences_counties_gin_idx
  ON public.notification_preferences USING gin (county_filters);
CREATE INDEX IF NOT EXISTS notification_preferences_roads_gin_idx
  ON public.notification_preferences USING gin (road_ids);
CREATE INDEX IF NOT EXISTS notification_preferences_hazards_gin_idx
  ON public.notification_preferences USING gin (hazard_types);
CREATE INDEX IF NOT EXISTS notification_preferences_severity_gin_idx
  ON public.notification_preferences USING gin (severities);

-- Existing policy is replaced with explicit owner-only policies. There is no
-- anonymous grant and no policy allowing one authenticated user to inspect or
-- modify another user's saved coordinates.
DROP POLICY IF EXISTS notification_prefs_own ON public.notification_preferences;
CREATE POLICY notification_prefs_select_own
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY notification_prefs_insert_own
  ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY notification_prefs_update_own
  ON public.notification_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY notification_prefs_delete_own
  ON public.notification_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;

-- Notification rows can be produced by several matching dimensions, but one
-- alert must create at most one nearby notification per user. Existing rows
-- remain compatible because these provenance fields are nullable.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_key_idx
  ON public.notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_source_user_idx
  ON public.notifications (source_type, source_id, user_id);

-- The existing trigger is SECURITY DEFINER so it can read private preference
-- rows and create recipient-owned notifications. It is intentionally limited
-- to public active alerts, explicit preference matches, and one dedupe key.
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
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  FOR preference IN
    SELECT *
    FROM public.notification_preferences
    WHERE alerts = true
      AND in_app_enabled = true
      AND (mute_until IS NULL OR mute_until <= now())
      AND user_id <> NEW.user_id
  LOOP
    radius_match := false;
    IF preference.radius_enabled
       AND preference.latitude IS NOT NULL
       AND preference.longitude IS NOT NULL
       AND NEW.latitude IS NOT NULL
       AND NEW.longitude IS NOT NULL THEN
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

    -- Location dimensions are OR. Content dimensions are AND. Empty content
    -- arrays mean no additional restriction; empty location arrays match none.
    IF (radius_match OR county_match OR road_match)
       AND (cardinality(preference.hazard_types) = 0
            OR NEW.hazard_type = ANY(preference.hazard_types))
       AND (cardinality(preference.severities) = 0
            OR NEW.severity = ANY(preference.severities)) THEN
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

COMMENT ON COLUMN public.notification_preferences.radius_enabled IS
  'Explicit opt-in for coordinate radius matching; saved coordinates are private.';
COMMENT ON COLUMN public.notification_preferences.in_app_enabled IS
  'Server-created in-app notifications. Browser permission is a separate local capability.';
