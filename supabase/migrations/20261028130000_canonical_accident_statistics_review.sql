-- REVIEW-ONLY / STAGING CANDIDATE.
-- Canonical accident identity for verified statistics.
--
-- incident_content_links is the sole Alert -> Accident Report relationship
-- authority. This migration deliberately does not create a source-link table
-- or a second link RPC. Confirmed Alert membership is read from that model.

DO $$
BEGIN
  IF to_regclass('public.incident_content_links') IS NULL THEN
    RAISE EXCEPTION 'canonical accident migration requires incident_content_links';
  END IF;
  IF to_regprocedure('public.has_min_role(uuid,public.app_role)') IS NULL THEN
    RAISE EXCEPTION 'canonical accident migration requires the role helper';
  END IF;
  IF to_regclass('public.accident_reports') IS NULL OR to_regclass('public.alerts') IS NULL THEN
    RAISE EXCEPTION 'canonical accident migration requires reports and alerts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='accident_reports'
      AND column_name='duplicate_of_report_id'
  ) THEN
    RAISE EXCEPTION 'canonical accident migration requires duplicate_of_report_id';
  END IF;
  IF to_regclass('public.canonical_accident_sources') IS NOT NULL
     OR to_regprocedure('public.canonical_link_alert_to_report(uuid,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'competing canonical source/link objects already exist; reconcile before applying';
  END IF;
END $$;

CREATE TABLE public.canonical_accident_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_report_id UUID NOT NULL REFERENCES public.accident_reports(id) ON DELETE RESTRICT,
  incident_status TEXT NOT NULL DEFAULT 'verified'
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
  WHERE deleted_at IS NULL;
CREATE INDEX canonical_incidents_statistics_idx
  ON public.canonical_accident_incidents(statistics_eligible,incident_status,created_at DESC)
  WHERE deleted_at IS NULL;

-- Additive, idempotent identity backfill: no existing Report is edited.
INSERT INTO public.canonical_accident_incidents(canonical_report_id,incident_status,statistics_eligible,verified_at)
SELECT r.id,'verified',true,now()
FROM public.accident_reports r
WHERE r.status='approved' AND r.duplicate_of_report_id IS NULL AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.canonical_accident_incidents i
    WHERE i.canonical_report_id=r.id AND i.deleted_at IS NULL
  );

CREATE OR REPLACE FUNCTION public.canonical_accident_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END;
$$;

CREATE TRIGGER canonical_accident_incident_touch
  BEFORE UPDATE ON public.canonical_accident_incidents
  FOR EACH ROW EXECUTE FUNCTION public.canonical_accident_touch();

CREATE OR REPLACE FUNCTION public.canonical_sync_report_incident()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.status='approved' AND NEW.duplicate_of_report_id IS NULL AND NEW.deleted_at IS NULL THEN
    INSERT INTO public.canonical_accident_incidents(
      canonical_report_id,incident_status,statistics_eligible,verified_at
    ) VALUES (NEW.id,'verified',true,now()) ON CONFLICT DO NOTHING;
  ELSIF TG_OP='UPDATE' AND NEW.duplicate_of_report_id IS NOT NULL
        AND NEW.duplicate_of_report_id <> COALESCE(OLD.duplicate_of_report_id,NEW.id) THEN
    UPDATE public.canonical_accident_incidents
    SET incident_status='merged',statistics_eligible=false,updated_at=now()
    WHERE canonical_report_id=NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER canonical_report_incident_sync
  AFTER INSERT OR UPDATE OF status,duplicate_of_report_id,deleted_at ON public.accident_reports
  FOR EACH ROW EXECUTE FUNCTION public.canonical_sync_report_incident();

ALTER TABLE public.canonical_accident_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canonical_accident_incidents FROM PUBLIC,anon;
GRANT SELECT ON public.canonical_accident_incidents TO authenticated;
GRANT ALL ON public.canonical_accident_incidents TO service_role;

CREATE POLICY canonical_incidents_editor_read
  ON public.canonical_accident_incidents FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));

-- One statistics row per approved, non-duplicate canonical Report. A single
-- confirmed Alert is exposed only as linked context; Alerts never add a
-- second accident row or casualty total.
CREATE VIEW public.canonical_accident_statistics AS
SELECT
  i.id AS incident_id,r.occurred_at,r.county,r.road,r.road_id,r.severity,
  r.latitude,r.longitude,r.vehicles_involved,r.fatalities,
  r.casualties AS injuries,r.casualty_breakdown,r.incident_type,
  'report'::text AS statistics_source,r.id AS report_id,linked_alert.alert_id
FROM public.canonical_accident_incidents i
JOIN public.accident_reports r ON r.id=i.canonical_report_id
  AND r.deleted_at IS NULL AND r.status='approved' AND r.duplicate_of_report_id IS NULL
LEFT JOIN LATERAL (
  SELECT l.content_id AS alert_id
  FROM public.incident_content_links l
  JOIN public.alerts a ON a.id=l.content_id AND a.deleted_at IS NULL
  WHERE l.canonical_report_id=r.id AND l.content_type='alert' AND l.status='confirmed'
    AND a.status IN ('active','resolved')
  ORDER BY l.reviewed_at ASC NULLS LAST,l.created_at ASC LIMIT 1
) linked_alert ON true
WHERE i.deleted_at IS NULL AND i.statistics_eligible
  AND i.incident_status IN ('verified','closed');

CREATE OR REPLACE FUNCTION public.public_canonical_accident_statistics(
  _from_date DATE DEFAULT NULL,_to_date DATE DEFAULT NULL,_county TEXT DEFAULT NULL,
  _road_id UUID DEFAULT NULL,_severity TEXT DEFAULT NULL
)
RETURNS TABLE (
  incident_id UUID,occurred_at TIMESTAMPTZ,county TEXT,road TEXT,road_id UUID,
  severity TEXT,latitude DOUBLE PRECISION,longitude DOUBLE PRECISION,
  vehicles_involved INTEGER,fatalities INTEGER,injuries INTEGER,casualty_breakdown JSONB,
  incident_type TEXT,statistics_source TEXT,report_id UUID,alert_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
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

REVOKE ALL ON FUNCTION public.canonical_accident_touch(),public.canonical_sync_report_incident() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.public_canonical_accident_statistics(DATE,DATE,TEXT,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_canonical_accident_statistics(DATE,DATE,TEXT,UUID,TEXT) TO anon,authenticated;

COMMENT ON TABLE public.canonical_accident_incidents IS
  'One canonical identity per approved non-duplicate Accident Report; Alert membership is read from confirmed incident_content_links.';
COMMENT ON VIEW public.canonical_accident_statistics IS
  'Approved-report-only accident statistics with optional confirmed Alert context and no duplicate casualty counting.';
