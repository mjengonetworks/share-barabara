-- REVIEW-ONLY / STAGING CANDIDATE.
-- Canonical accident identity for verified statistics.
--
-- This migration is intentionally separate from
-- 20261027120000_cross_content_editorial_relationships.sql. It must not be
-- executed until that migration and the fourth-instance duplicate-report
-- workflow have been approved and installed in the same environment.
-- It does not revoke or change anonymous execution of role helpers.

DO $$
BEGIN
  IF to_regclass('public.editorial_content_relationships') IS NULL
     OR to_regprocedure('public.has_min_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'canonical accident migration requires the cross-content migration';
  END IF;
  IF to_regclass('public.accident_reports') IS NULL
     OR to_regclass('public.alerts') IS NULL THEN
    RAISE EXCEPTION 'canonical accident migration requires reports and alerts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='accident_reports'
      AND column_name='duplicate_of_report_id'
  ) THEN
    RAISE EXCEPTION 'canonical accident migration requires the reviewed duplicate-report migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND c.relname IN ('canonical_accident_incidents','canonical_accident_sources')
  ) THEN
    RAISE EXCEPTION 'canonical accident objects already exist; inspect before applying';
  END IF;
END $$;

CREATE TABLE public.canonical_accident_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_report_id UUID REFERENCES public.accident_reports(id) ON DELETE RESTRICT,
  incident_status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (incident_status IN ('candidate','verified','closed','merged')),
  statistics_eligible BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (deleted_at IS NULL OR deleted_by IS NOT NULL),
  CHECK ((statistics_eligible = false) OR incident_status IN ('verified','closed'))
);

CREATE UNIQUE INDEX canonical_incidents_report_uq
  ON public.canonical_accident_incidents(canonical_report_id)
  WHERE canonical_report_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX canonical_incidents_statistics_idx
  ON public.canonical_accident_incidents(statistics_eligible,incident_status,created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE public.canonical_accident_sources (
  incident_id UUID NOT NULL REFERENCES public.canonical_accident_incidents(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL CHECK (source_type IN ('report','alert')),
  source_id UUID NOT NULL,
  source_role TEXT NOT NULL CHECK (source_role IN ('canonical_report','supporting_alert','alert_only')),
  verified_for_statistics BOOLEAN NOT NULL DEFAULT false,
  verified_fatalities INTEGER CHECK (verified_fatalities IS NULL OR verified_fatalities >= 0),
  verified_injuries INTEGER CHECK (verified_injuries IS NULL OR verified_injuries >= 0),
  source_snapshot_hash TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (incident_id,source_type,source_id),
  CHECK (deleted_at IS NULL OR deleted_by IS NOT NULL),
  CHECK ((source_type='report' AND source_role='canonical_report')
      OR (source_type='alert' AND source_role IN ('supporting_alert','alert_only'))),
  CHECK ((verified_for_statistics = false)
      OR source_role='alert_only'
      OR source_role='canonical_report')
);

CREATE UNIQUE INDEX canonical_sources_active_source_uq
  ON public.canonical_accident_sources(source_type,source_id)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX canonical_sources_active_report_role_uq
  ON public.canonical_accident_sources(incident_id)
  WHERE source_role='canonical_report' AND deleted_at IS NULL;
CREATE INDEX canonical_sources_incident_idx
  ON public.canonical_accident_sources(incident_id,source_role,created_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_canonical_accident_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.source_type='report' THEN
    IF NEW.source_role <> 'canonical_report'
       OR NOT EXISTS (
         SELECT 1 FROM public.accident_reports r
         WHERE r.id=NEW.source_id AND r.deleted_at IS NULL
       ) THEN
      RAISE EXCEPTION 'canonical source must reference a non-deleted report';
    END IF;
  ELSIF NEW.source_type='alert' THEN
    IF NEW.source_role NOT IN ('supporting_alert','alert_only')
       OR NOT EXISTS (
         SELECT 1 FROM public.alerts a
         WHERE a.id=NEW.source_id AND a.deleted_at IS NULL
       ) THEN
      RAISE EXCEPTION 'canonical source must reference a non-deleted alert';
    END IF;
  ELSE
    RAISE EXCEPTION 'unsupported canonical accident source type';
  END IF;

  IF NEW.source_role <> 'alert_only'
     AND (NEW.verified_fatalities IS NOT NULL OR NEW.verified_injuries IS NOT NULL) THEN
    RAISE EXCEPTION 'verified alert-only casualty values cannot be attached to a report source';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER canonical_accident_source_validate
  BEFORE INSERT OR UPDATE ON public.canonical_accident_sources
  FOR EACH ROW EXECUTE FUNCTION public.validate_canonical_accident_source();

CREATE OR REPLACE FUNCTION public.canonical_accident_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
  NEW.updated_at=now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER canonical_accident_incident_touch
  BEFORE UPDATE ON public.canonical_accident_incidents
  FOR EACH ROW EXECUTE FUNCTION public.canonical_accident_touch();

ALTER TABLE public.canonical_accident_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_accident_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canonical_accident_incidents,public.canonical_accident_sources FROM PUBLIC,anon;
GRANT SELECT ON public.canonical_accident_incidents,public.canonical_accident_sources TO authenticated;
GRANT ALL ON public.canonical_accident_incidents,public.canonical_accident_sources TO service_role;

CREATE POLICY canonical_incidents_editor_read
  ON public.canonical_accident_incidents FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY canonical_sources_editor_read
  ON public.canonical_accident_sources FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));

-- One statistics row per incident. This is not granted directly to anon;
-- public access is through the filtered SECURITY DEFINER RPC below.
CREATE VIEW public.canonical_accident_statistics AS
SELECT
  i.id AS incident_id,
  COALESCE(r.occurred_at,a.created_at) AS occurred_at,
  COALESCE(r.county,a.county) AS county,
  COALESCE(r.road,a.road) AS road,
  COALESCE(r.road_id,a.road_id) AS road_id,
  COALESCE(r.severity,a.severity) AS severity,
  r.latitude AS report_latitude,
  r.longitude AS report_longitude,
  a.latitude AS alert_latitude,
  a.longitude AS alert_longitude,
  COALESCE(r.latitude,a.latitude) AS latitude,
  COALESCE(r.longitude,a.longitude) AS longitude,
  r.vehicles_involved,
  CASE WHEN r.id IS NOT NULL THEN r.fatalities ELSE s.verified_fatalities END AS fatalities,
  CASE WHEN r.id IS NOT NULL THEN r.casualties ELSE s.verified_injuries END AS injuries,
  CASE WHEN r.id IS NOT NULL THEN r.casualty_breakdown ELSE '{}'::jsonb END AS casualty_breakdown,
  r.incident_type,
  CASE WHEN r.id IS NOT NULL THEN 'report'::text ELSE 'alert_only'::text END AS statistics_source,
  r.id AS report_id,
  CASE WHEN r.id IS NULL THEN a.id ELSE NULL END AS alert_id
FROM public.canonical_accident_incidents i
LEFT JOIN public.accident_reports r
  ON r.id=i.canonical_report_id
 AND r.deleted_at IS NULL
 AND r.status='approved'
LEFT JOIN LATERAL (
  SELECT s1.* FROM public.canonical_accident_sources s1
  WHERE s1.incident_id=i.id AND s1.deleted_at IS NULL
    AND s1.source_type='alert'
    AND s1.source_role='alert_only'
    AND s1.verified_for_statistics
  ORDER BY s1.created_at ASC
  LIMIT 1
) s ON r.id IS NULL
LEFT JOIN public.alerts a
  ON a.id=s.source_id AND a.deleted_at IS NULL AND a.status='active'
WHERE i.deleted_at IS NULL
  AND i.statistics_eligible
  AND (
    (r.id IS NOT NULL AND i.canonical_report_id IS NOT NULL)
    OR (r.id IS NULL AND s.source_id IS NOT NULL AND a.id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.public_canonical_accident_statistics(
  _from_date DATE DEFAULT NULL,
  _to_date DATE DEFAULT NULL,
  _county TEXT DEFAULT NULL,
  _road_id UUID DEFAULT NULL,
  _severity TEXT DEFAULT NULL
)
RETURNS TABLE (
  incident_id UUID,
  occurred_at TIMESTAMPTZ,
  county TEXT,
  road TEXT,
  road_id UUID,
  severity TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  vehicles_involved INTEGER,
  fatalities INTEGER,
  injuries INTEGER,
  casualty_breakdown JSONB,
  incident_type TEXT,
  statistics_source TEXT,
  report_id UUID,
  alert_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp
AS $$
  SELECT s.incident_id,s.occurred_at,s.county,s.road,s.road_id,s.severity,
    s.latitude,s.longitude,s.vehicles_involved,s.fatalities,s.injuries,
    s.casualty_breakdown,s.incident_type,s.statistics_source,s.report_id,s.alert_id
  FROM public.canonical_accident_statistics s
  WHERE (_from_date IS NULL OR s.occurred_at >= _from_date::timestamptz)
    AND (_to_date IS NULL OR s.occurred_at < (_to_date + 1)::timestamptz)
    AND (_county IS NULL OR s.county=_county)
    AND (_road_id IS NULL OR s.road_id=_road_id)
    AND (_severity IS NULL OR s.severity=_severity)
  ORDER BY s.occurred_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.canonical_link_alert_to_report(
  _alert_id UUID,
  _report_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE incident_id UUID;
DECLARE existing_incident UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(),'moderator') THEN
    RAISE EXCEPTION 'moderator role required';
  END IF;
  PERFORM 1 FROM public.alerts WHERE id=_alert_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'alert is unavailable'; END IF;
  PERFORM 1 FROM public.accident_reports
    WHERE id=_report_id AND deleted_at IS NULL AND status='approved' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'approved report is required'; END IF;

  SELECT c.incident_id INTO existing_incident
  FROM public.canonical_accident_sources c
  WHERE c.source_type='alert' AND c.source_id=_alert_id AND c.deleted_at IS NULL;
  IF existing_incident IS NOT NULL THEN
    SELECT i.id INTO incident_id FROM public.canonical_accident_incidents i
    WHERE i.id=existing_incident AND i.deleted_at IS NULL FOR UPDATE;
    IF incident_id IS NULL THEN RAISE EXCEPTION 'alert incident is unavailable'; END IF;
    IF EXISTS (SELECT 1 FROM public.canonical_accident_incidents
               WHERE id=incident_id AND canonical_report_id IS NOT NULL
                 AND canonical_report_id<>_report_id) THEN
      RAISE EXCEPTION 'alert is already linked to a different canonical report';
    END IF;
  ELSE
    SELECT i.id INTO incident_id FROM public.canonical_accident_incidents i
    WHERE i.canonical_report_id=_report_id AND i.deleted_at IS NULL FOR UPDATE;
    IF incident_id IS NULL THEN
      INSERT INTO public.canonical_accident_incidents(canonical_report_id,incident_status,statistics_eligible,verified_by,verified_at)
      VALUES(_report_id,'verified',true,auth.uid(),now()) RETURNING id INTO incident_id;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.canonical_accident_incidents
             WHERE canonical_report_id=_report_id AND id<>incident_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'report already belongs to another canonical incident';
  END IF;
  UPDATE public.canonical_accident_incidents
  SET canonical_report_id=_report_id,incident_status='verified',statistics_eligible=true,
      verified_by=auth.uid(),verified_at=now()
  WHERE id=incident_id;

  INSERT INTO public.canonical_accident_sources(incident_id,source_type,source_id,source_role,created_by)
  VALUES(incident_id,'report',_report_id,'canonical_report',auth.uid())
  ON CONFLICT (incident_id,source_type,source_id) DO UPDATE
    SET deleted_at=NULL,deleted_by=NULL;
  INSERT INTO public.canonical_accident_sources(incident_id,source_type,source_id,source_role,created_by)
  VALUES(incident_id,'alert',_alert_id,'supporting_alert',auth.uid())
  ON CONFLICT (incident_id,source_type,source_id) DO UPDATE
    SET source_role='supporting_alert',verified_for_statistics=false,
        verified_fatalities=NULL,verified_injuries=NULL,deleted_at=NULL,deleted_by=NULL;

  INSERT INTO public.editorial_content_relationships(
    source_type,source_id,target_type,target_id,relationship_type,created_by)
  VALUES('alert',_alert_id,'report',_report_id,'follows_up',auth.uid())
  ON CONFLICT DO NOTHING;
  RETURN incident_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.canonical_verify_alert_only(
  _alert_id UUID,
  _verified_fatalities INTEGER DEFAULT NULL,
  _verified_injuries INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE incident_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(),'moderator') THEN
    RAISE EXCEPTION 'moderator role required';
  END IF;
  IF _verified_fatalities IS NOT NULL AND _verified_fatalities < 0
     OR _verified_injuries IS NOT NULL AND _verified_injuries < 0 THEN
    RAISE EXCEPTION 'verified casualty values cannot be negative';
  END IF;
  PERFORM 1 FROM public.alerts WHERE id=_alert_id AND deleted_at IS NULL AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'active alert is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.canonical_accident_sources
             WHERE source_type='alert' AND source_id=_alert_id AND deleted_at IS NULL
               AND source_role<>'alert_only') THEN
    RAISE EXCEPTION 'alert is already linked to a canonical report';
  END IF;
  SELECT incident_id INTO incident_id FROM public.canonical_accident_sources
  WHERE source_type='alert' AND source_id=_alert_id AND deleted_at IS NULL;
  IF incident_id IS NULL THEN
    INSERT INTO public.canonical_accident_incidents(incident_status,statistics_eligible,verified_by,verified_at)
    VALUES('verified',true,auth.uid(),now()) RETURNING id INTO incident_id;
  ELSE
    UPDATE public.canonical_accident_incidents
    SET incident_status='verified',statistics_eligible=true,verified_by=auth.uid(),verified_at=now()
    WHERE id=incident_id AND deleted_at IS NULL;
  END IF;
  INSERT INTO public.canonical_accident_sources(
    incident_id,source_type,source_id,source_role,verified_for_statistics,
    verified_fatalities,verified_injuries,created_by)
  VALUES(incident_id,'alert',_alert_id,'alert_only',true,_verified_fatalities,_verified_injuries,auth.uid())
  ON CONFLICT (incident_id,source_type,source_id) DO UPDATE SET
    source_role='alert_only',verified_for_statistics=true,
    verified_fatalities=EXCLUDED.verified_fatalities,
    verified_injuries=EXCLUDED.verified_injuries,deleted_at=NULL,deleted_by=NULL;
  RETURN incident_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.canonical_unlink_source(
  _incident_id UUID,
  _source_type TEXT,
  _source_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
DECLARE source_row public.canonical_accident_sources;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(),'moderator') THEN
    RAISE EXCEPTION 'moderator role required';
  END IF;
  SELECT * INTO source_row FROM public.canonical_accident_sources
  WHERE incident_id=_incident_id AND source_type=_source_type AND source_id=_source_id
    AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'active canonical source not found'; END IF;
  UPDATE public.canonical_accident_sources
  SET deleted_at=now(),deleted_by=auth.uid()
  WHERE incident_id=_incident_id AND source_type=_source_type AND source_id=_source_id;
  IF source_row.source_type='report' THEN
    UPDATE public.canonical_accident_incidents
    SET canonical_report_id=NULL,incident_status='candidate',statistics_eligible=false
    WHERE id=_incident_id;
  ELSIF NOT EXISTS (SELECT 1 FROM public.canonical_accident_sources
                    WHERE incident_id=_incident_id AND deleted_at IS NULL) THEN
    UPDATE public.canonical_accident_incidents
    SET incident_status='merged',statistics_eligible=false,deleted_at=now(),deleted_by=auth.uid()
    WHERE id=_incident_id;
  END IF;
  RETURN true;
END;
$$;

-- Synchronize the fourth-instance duplicate-report workflow. The fourth
-- migration remains the owner of merge_duplicate_report; this trigger only
-- transfers an already canonical incident when that workflow marks a report
-- as a duplicate. It never publishes or restores content.
CREATE OR REPLACE FUNCTION public.canonical_sync_report_duplicate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old_incident UUID;
DECLARE target_incident UUID;
DECLARE source_row RECORD;
BEGIN
  IF NEW.duplicate_of_report_id IS NULL
     OR NEW.duplicate_of_report_id=OLD.duplicate_of_report_id THEN RETURN NEW; END IF;
  IF COALESCE(auth.uid(),NEW.reviewed_by) IS NULL THEN
    RAISE EXCEPTION 'canonical duplicate merge requires a reviewer';
  END IF;
  SELECT id INTO target_incident FROM public.canonical_accident_incidents
  WHERE canonical_report_id=NEW.duplicate_of_report_id AND deleted_at IS NULL FOR UPDATE;
  SELECT id INTO old_incident FROM public.canonical_accident_incidents
  WHERE canonical_report_id=NEW.id AND deleted_at IS NULL FOR UPDATE;
  IF old_incident IS NULL THEN RETURN NEW; END IF;
  IF target_incident IS NULL THEN
    UPDATE public.canonical_accident_incidents
    SET canonical_report_id=NEW.duplicate_of_report_id,updated_at=now()
    WHERE id=old_incident;
    UPDATE public.canonical_accident_sources
    SET deleted_at=now(),deleted_by=COALESCE(auth.uid(),NEW.reviewed_by)
    WHERE incident_id=old_incident AND source_type='report' AND source_id=NEW.id AND deleted_at IS NULL;
    INSERT INTO public.canonical_accident_sources(incident_id,source_type,source_id,source_role,created_by)
    VALUES(old_incident,'report',NEW.duplicate_of_report_id,'canonical_report',COALESCE(auth.uid(),NEW.reviewed_by))
    ON CONFLICT (incident_id,source_type,source_id) DO UPDATE SET deleted_at=NULL,deleted_by=NULL;
  ELSE
    FOR source_row IN
      SELECT * FROM public.canonical_accident_sources
      WHERE incident_id=old_incident AND source_type='alert' AND deleted_at IS NULL
      FOR UPDATE
    LOOP
      IF EXISTS (SELECT 1 FROM public.canonical_accident_sources
                 WHERE incident_id=target_incident AND source_type='alert'
                   AND source_id=source_row.source_id AND deleted_at IS NULL) THEN
        UPDATE public.canonical_accident_sources
        SET deleted_at=now(),deleted_by=COALESCE(auth.uid(),NEW.reviewed_by)
        WHERE incident_id=old_incident AND source_type='alert' AND source_id=source_row.source_id;
      ELSE
        UPDATE public.canonical_accident_sources
        SET incident_id=target_incident
        WHERE incident_id=old_incident AND source_type='alert' AND source_id=source_row.source_id;
      END IF;
    END LOOP;
    UPDATE public.canonical_accident_sources
    SET deleted_at=now(),deleted_by=COALESCE(auth.uid(),NEW.reviewed_by)
    WHERE incident_id=old_incident AND deleted_at IS NULL;
    UPDATE public.canonical_accident_incidents
    SET incident_status='merged',statistics_eligible=false,deleted_at=now(),deleted_by=COALESCE(auth.uid(),NEW.reviewed_by)
    WHERE id=old_incident;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER canonical_report_duplicate_sync
  AFTER UPDATE OF duplicate_of_report_id ON public.accident_reports
  FOR EACH ROW EXECUTE FUNCTION public.canonical_sync_report_duplicate();

REVOKE ALL ON FUNCTION public.validate_canonical_accident_source(),public.canonical_accident_touch(),
  public.canonical_link_alert_to_report(UUID,UUID),public.canonical_verify_alert_only(UUID,INTEGER,INTEGER),
  public.canonical_unlink_source(UUID,TEXT,UUID),public.canonical_sync_report_duplicate() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canonical_link_alert_to_report(UUID,UUID),
  public.canonical_verify_alert_only(UUID,INTEGER,INTEGER),public.canonical_unlink_source(UUID,TEXT,UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_canonical_accident_statistics(DATE,DATE,TEXT,UUID,TEXT)
  TO anon,authenticated;
GRANT ALL ON public.canonical_accident_incidents,public.canonical_accident_sources TO service_role;
