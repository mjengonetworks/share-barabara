-- REVIEW-ONLY dependent migration.
-- Requires 20261028130000_canonical_accident_statistics_review.sql and the
-- authoritative 20261029100000_incident_content_links_review.sql.
-- This migration is intentionally not executed by this workstream.
-- It adds canonical incident classification without replacing the Fourth
-- instance's geography/entity taxonomy.

DO $$
BEGIN
  IF to_regclass('public.canonical_accident_incidents') IS NULL
     OR to_regclass('public.incident_content_links') IS NULL THEN
    RAISE EXCEPTION 'canonical accident migration must be applied first';
  END IF;
END $$;

ALTER TABLE public.canonical_accident_incidents
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS admin_area TEXT,
  ADD COLUMN IF NOT EXISTS locality TEXT,
  ADD COLUMN IF NOT EXISTS transport_corridor TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS verified_incident_type TEXT,
  ADD COLUMN IF NOT EXISTS verified_severity TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.canonical_accident_incidents'::regclass
      AND conname='canonical_incidents_country_code_ck'
  ) THEN
    ALTER TABLE public.canonical_accident_incidents
      ADD CONSTRAINT canonical_incidents_country_code_ck
      CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.canonical_accident_incidents'::regclass
      AND conname='canonical_incidents_latitude_ck'
  ) THEN
    ALTER TABLE public.canonical_accident_incidents
      ADD CONSTRAINT canonical_incidents_latitude_ck
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.canonical_accident_incidents'::regclass
      AND conname='canonical_incidents_longitude_ck'
  ) THEN
    ALTER TABLE public.canonical_accident_incidents
      ADD CONSTRAINT canonical_incidents_longitude_ck
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.canonical_accident_incidents'::regclass
      AND conname='canonical_incidents_coordinate_pair_ck'
  ) THEN
    ALTER TABLE public.canonical_accident_incidents
      ADD CONSTRAINT canonical_incidents_coordinate_pair_ck
      CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.canonical_incident_transport_modes (
  incident_id UUID NOT NULL REFERENCES public.canonical_accident_incidents(id) ON DELETE RESTRICT,
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('road','rail','aviation','maritime','inland_water','other')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (incident_id, transport_mode)
);

CREATE UNIQUE INDEX IF NOT EXISTS canonical_incident_primary_mode_uq
  ON public.canonical_incident_transport_modes(incident_id)
  WHERE is_primary AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS canonical_incident_modes_active_idx
  ON public.canonical_incident_transport_modes(transport_mode, incident_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.canonical_incident_transport_modes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canonical_incident_transport_modes FROM PUBLIC, anon;
GRANT SELECT ON public.canonical_incident_transport_modes TO authenticated;
GRANT ALL ON public.canonical_incident_transport_modes TO service_role;

DROP POLICY IF EXISTS canonical_incident_modes_editor_read ON public.canonical_incident_transport_modes;
CREATE POLICY canonical_incident_modes_editor_read
  ON public.canonical_incident_transport_modes FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));

CREATE OR REPLACE FUNCTION public.canonical_set_incident_classification(
  _incident_id UUID,
  _country_code TEXT DEFAULT NULL,
  _admin_area TEXT DEFAULT NULL,
  _locality TEXT DEFAULT NULL,
  _transport_corridor TEXT DEFAULT NULL,
  _latitude NUMERIC DEFAULT NULL,
  _longitude NUMERIC DEFAULT NULL,
  _incident_type TEXT DEFAULT NULL,
  _severity TEXT DEFAULT NULL,
  _transport_modes TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE mode_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_min_role(auth.uid(),'moderator') THEN
    RAISE EXCEPTION 'moderator role required';
  END IF;
  IF _country_code IS NOT NULL AND _country_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'country_code must be an ISO alpha-2 code';
  END IF;
  IF _latitude IS NULL AND _longitude IS NOT NULL OR _latitude IS NOT NULL AND _longitude IS NULL THEN
    RAISE EXCEPTION 'latitude and longitude must be supplied together';
  END IF;
  IF _latitude IS NOT NULL AND (_latitude < -90 OR _latitude > 90) THEN
    RAISE EXCEPTION 'latitude is out of range';
  END IF;
  IF _longitude IS NOT NULL AND (_longitude < -180 OR _longitude > 180) THEN
    RAISE EXCEPTION 'longitude is out of range';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.canonical_accident_incidents
    WHERE id=_incident_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'canonical incident is unavailable';
  END IF;
  IF COALESCE(array_length(_transport_modes,1),0)=0 THEN
    RAISE EXCEPTION 'at least one transport mode is required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_transport_modes) AS m(mode_name)
    WHERE mode_name NOT IN ('road','rail','aviation','maritime','inland_water','other')
  ) THEN
    RAISE EXCEPTION 'unsupported transport mode';
  END IF;

  UPDATE public.canonical_accident_incidents
  SET country_code=_country_code, admin_area=_admin_area, locality=_locality,
      transport_corridor=_transport_corridor, latitude=_latitude, longitude=_longitude,
      verified_incident_type=_incident_type, verified_severity=_severity,
      updated_at=now()
  WHERE id=_incident_id;

  UPDATE public.canonical_incident_transport_modes
  SET deleted_at=now(), deleted_by=auth.uid()
  WHERE incident_id=_incident_id AND deleted_at IS NULL
    AND NOT (transport_mode=ANY(_transport_modes));

  FOREACH mode_name IN ARRAY _transport_modes LOOP
    INSERT INTO public.canonical_incident_transport_modes(
      incident_id,transport_mode,is_primary,verified_by,verified_at
    ) VALUES (
      _incident_id,mode_name,mode_name=_transport_modes[1],auth.uid(),now()
    )
    ON CONFLICT (incident_id,transport_mode) DO UPDATE SET
      is_primary=EXCLUDED.is_primary,verified_by=auth.uid(),verified_at=now(),
      deleted_at=NULL,deleted_by=NULL;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.canonical_set_incident_classification(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.canonical_set_incident_classification(UUID,TEXT,TEXT,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT[]) TO authenticated;

-- One row per canonical incident/mode. The incident_id remains the counting
-- key, so multimodal mode rows cannot inflate the overall incident total.
CREATE OR REPLACE VIEW public.canonical_transport_statistics AS
SELECT
  s.incident_id,
  m.transport_mode,
  m.is_primary,
  i.country_code,
  i.admin_area,
  i.locality,
  COALESCE(i.transport_corridor,s.road) AS transport_corridor,
  i.latitude,
  i.longitude,
  s.occurred_at,
  s.county,
  s.road,
  s.road_id,
  s.vehicles_involved,
  s.casualty_breakdown,
  COALESCE(i.verified_severity,s.severity) AS severity,
  COALESCE(i.verified_incident_type,s.incident_type) AS incident_type,
  s.fatalities,
  s.injuries,
  s.casualty_breakdown,
  s.statistics_source,
  s.report_id,
  s.alert_id
FROM public.canonical_accident_statistics s
JOIN public.canonical_accident_incidents i ON i.id=s.incident_id
JOIN public.canonical_incident_transport_modes m ON m.incident_id=i.id AND m.deleted_at IS NULL
WHERE i.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.public_canonical_transport_statistics(
  _from DATE DEFAULT NULL,
  _to DATE DEFAULT NULL,
  _country_code TEXT DEFAULT NULL,
  _transport_mode TEXT DEFAULT NULL,
  _admin_area TEXT DEFAULT NULL
)
RETURNS TABLE(
  incident_id UUID,
  transport_mode TEXT,
  is_primary BOOLEAN,
  country_code TEXT,
  admin_area TEXT,
  locality TEXT,
  transport_corridor TEXT,
  occurred_at TIMESTAMPTZ,
  county TEXT,
  road TEXT,
  road_id UUID,
  severity TEXT,
  incident_type TEXT,
  vehicles_involved INTEGER,
  casualty_breakdown JSONB,
  fatalities INTEGER,
  injuries INTEGER,
  latitude NUMERIC,
  longitude NUMERIC,
  report_id UUID,
  alert_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
  SELECT s.incident_id,s.transport_mode,s.is_primary,s.country_code,s.admin_area,
    s.locality,s.transport_corridor,s.occurred_at,s.county,s.road,s.road_id,
    s.severity,s.incident_type,s.vehicles_involved,s.casualty_breakdown,
    s.fatalities,s.injuries,s.latitude,s.longitude,s.report_id,s.alert_id
  FROM public.canonical_transport_statistics s
  WHERE (_from IS NULL OR s.occurred_at::date >= _from)
    AND (_to IS NULL OR s.occurred_at::date <= _to)
    AND (_country_code IS NULL OR s.country_code=_country_code)
    AND (_transport_mode IS NULL OR s.transport_mode=_transport_mode)
    AND (_admin_area IS NULL OR s.admin_area=_admin_area);
$$;

REVOKE ALL ON FUNCTION public.public_canonical_transport_statistics(DATE,DATE,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_canonical_transport_statistics(DATE,DATE,TEXT,TEXT,TEXT) TO anon,authenticated;

-- Map consumers must use verified coordinates only. Rows without coordinates
-- remain available to text/statistics consumers but do not produce markers.
CREATE OR REPLACE FUNCTION public.public_canonical_transport_map(
  _from DATE DEFAULT NULL,
  _to DATE DEFAULT NULL,
  _country_code TEXT DEFAULT NULL,
  _admin_area TEXT DEFAULT NULL,
  _transport_mode TEXT DEFAULT NULL,
  _transport_corridor TEXT DEFAULT NULL,
  _incident_type TEXT DEFAULT NULL,
  _severity TEXT DEFAULT NULL
)
RETURNS TABLE(
  incident_id UUID,
  transport_mode TEXT,
  country_code TEXT,
  admin_area TEXT,
  transport_corridor TEXT,
  occurred_at TIMESTAMPTZ,
  severity TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  report_id UUID,
  alert_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
  SELECT s.incident_id,s.transport_mode,s.country_code,s.admin_area,
    s.transport_corridor,s.occurred_at,s.severity,s.latitude,s.longitude,
    s.report_id,s.alert_id
  FROM public.canonical_transport_statistics s
  WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    AND (_from IS NULL OR s.occurred_at::date >= _from)
    AND (_to IS NULL OR s.occurred_at::date <= _to)
    AND (_transport_mode IS NULL OR s.transport_mode=_transport_mode)
    AND (_country_code IS NULL OR s.country_code=_country_code)
    AND (_admin_area IS NULL OR s.admin_area=_admin_area)
    AND (_transport_corridor IS NULL OR s.transport_corridor=_transport_corridor)
    AND (_incident_type IS NULL OR s.incident_type=_incident_type)
    AND (_severity IS NULL OR s.severity=_severity);
$$;

REVOKE ALL ON FUNCTION public.public_canonical_transport_map(DATE,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_canonical_transport_map(DATE,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon,authenticated;
