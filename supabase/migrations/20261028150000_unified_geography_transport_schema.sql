-- Unified geography and transport schema.
-- Additive migration candidate. Do not apply until the owner approves the
-- dependency order documented in docs/unified-geography-transport-contract.md.
-- Expected order: canonical incident identity (second instance), canonical
-- transport statistics extension (second instance), this migration, then
-- public geography/map adapters. No historical backfill is performed here.

DO $$
BEGIN
  IF to_regclass('public.roads') IS NULL
     OR to_regclass('public.accident_reports') IS NULL
     OR to_regclass('public.alerts') IS NULL
     OR to_regclass('public.news') IS NULL
     OR to_regclass('public.infrastructure_issues') IS NULL
     OR to_regclass('public.campaigns') IS NULL THEN
    RAISE EXCEPTION 'unified geography migration requires existing editorial tables and roads';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.countries (
  iso_code TEXT PRIMARY KEY CHECK (iso_code ~ '^[A-Z]{2}$'),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.countries (iso_code, name)
VALUES ('KE', 'Kenya')
ON CONFLICT (iso_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_areas (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  level TEXT NOT NULL CHECK (level IN ('county','state','province','region','district','territory','other')),
  name TEXT NOT NULL,
  code TEXT,
  parent_id TEXT REFERENCES public.admin_areas(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, level, name),
  UNIQUE (country_code, level, code)
);

-- Stable Kenya county identifiers. Existing county text is not rewritten.
INSERT INTO public.admin_areas (id, country_code, level, name, code)
VALUES
  ('KE-001','KE','county','Baringo','001'),('KE-002','KE','county','Bomet','002'),
  ('KE-003','KE','county','Bungoma','003'),('KE-004','KE','county','Busia','004'),
  ('KE-005','KE','county','Elgeyo-Marakwet','005'),('KE-006','KE','county','Embu','006'),
  ('KE-007','KE','county','Garissa','007'),('KE-008','KE','county','Homa Bay','008'),
  ('KE-009','KE','county','Isiolo','009'),('KE-010','KE','county','Kajiado','010'),
  ('KE-011','KE','county','Kakamega','011'),('KE-012','KE','county','Kericho','012'),
  ('KE-013','KE','county','Kiambu','013'),('KE-014','KE','county','Kilifi','014'),
  ('KE-015','KE','county','Kirinyaga','015'),('KE-016','KE','county','Kisii','016'),
  ('KE-017','KE','county','Kisumu','017'),('KE-018','KE','county','Kitui','018'),
  ('KE-019','KE','county','Kwale','019'),('KE-020','KE','county','Laikipia','020'),
  ('KE-021','KE','county','Lamu','021'),('KE-022','KE','county','Machakos','022'),
  ('KE-023','KE','county','Makueni','023'),('KE-024','KE','county','Mandera','024'),
  ('KE-025','KE','county','Marsabit','025'),('KE-026','KE','county','Meru','026'),
  ('KE-027','KE','county','Migori','027'),('KE-028','KE','county','Mombasa','028'),
  ('KE-029','KE','county','Murang''a','029'),('KE-030','KE','county','Nairobi','030'),
  ('KE-031','KE','county','Nakuru','031'),('KE-032','KE','county','Nandi','032'),
  ('KE-033','KE','county','Narok','033'),('KE-034','KE','county','Nyamira','034'),
  ('KE-035','KE','county','Nyandarua','035'),('KE-036','KE','county','Nyeri','036'),
  ('KE-037','KE','county','Samburu','037'),('KE-038','KE','county','Siaya','038'),
  ('KE-039','KE','county','Taita-Taveta','039'),('KE-040','KE','county','Tana River','040'),
  ('KE-041','KE','county','Tharaka-Nithi','041'),('KE-042','KE','county','Trans Nzoia','042'),
  ('KE-043','KE','county','Turkana','043'),('KE-044','KE','county','Uasin Gishu','044'),
  ('KE-045','KE','county','Vihiga','045'),('KE-046','KE','county','Wajir','046'),
  ('KE-047','KE','county','West Pokot','047')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.transport_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('road','railway','station','airport','airfield','port','waterway','corridor','other')),
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  admin_area_id TEXT REFERENCES public.admin_areas(id) ON DELETE SET NULL,
  road_id UUID REFERENCES public.roads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  latitude NUMERIC CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude NUMERIC CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  geometry JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, slug),
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL))
);

-- The existing roads table remains authoritative. These linked rows provide a
-- common entity surface without duplicating road records or changing them.
INSERT INTO public.transport_entities (id, entity_type, country_code, name, slug, road_id, verified)
SELECT r.id, 'road', 'KE', r.name, r.slug, r.id, true
FROM public.roads r
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.transport_entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES public.transport_entities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, normalized_alias)
);

CREATE TABLE IF NOT EXISTS public.transport_incident_types (
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('road','rail','aviation','maritime','inland_water','other')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (transport_mode, value)
);

INSERT INTO public.transport_incident_types (transport_mode, value, label)
VALUES
 ('road','vehicle_collision','Vehicle collision'),('road','pedestrian_collision','Pedestrian collision'),
 ('road','motorcycle_collision','Motorcycle-related collision'),('road','vehicle_rollover','Vehicle rollover'),
 ('road','other_road_incident','Other verified road incident'),
 ('rail','train_collision','Train collision'),('rail','derailment','Derailment'),
 ('rail','level_crossing_incident','Level-crossing incident'),('rail','rail_passenger_worker_incident','Passenger or worker incident'),
 ('rail','other_rail_incident','Other verified railway incident'),
 ('aviation','aircraft_crash','Aircraft crash'),('aviation','runway_incident','Runway incident'),
 ('aviation','emergency_landing','Emergency landing'),('aviation','ground_handling_incident','Ground-handling incident'),
 ('aviation','other_aviation_incident','Other verified aviation incident'),
 ('maritime','vessel_collision','Vessel collision'),('maritime','grounding','Grounding'),
 ('maritime','maritime_passenger_incident','Maritime passenger incident'),('maritime','other_maritime_incident','Other verified maritime incident'),
 ('inland_water','capsizing','Capsizing'),('inland_water','passenger_ferry_incident','Passenger ferry incident'),
 ('inland_water','waterway_collision','Waterway collision'),('inland_water','other_water_incident','Other verified inland-water incident'),
 ('other','other_transport_incident','Other verified transport incident')
ON CONFLICT (transport_mode, value) DO NOTHING;

ALTER TABLE public.accident_reports
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS admin_area_id TEXT REFERENCES public.admin_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT,
  ADD COLUMN IF NOT EXISTS transport_entity_id UUID REFERENCES public.transport_entities(id) ON DELETE SET NULL;
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS admin_area_id TEXT REFERENCES public.admin_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT,
  ADD COLUMN IF NOT EXISTS transport_entity_id UUID REFERENCES public.transport_entities(id) ON DELETE SET NULL;
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS admin_area_id TEXT REFERENCES public.admin_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT,
  ADD COLUMN IF NOT EXISTS transport_entity_id UUID REFERENCES public.transport_entities(id) ON DELETE SET NULL;
ALTER TABLE public.infrastructure_issues
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS admin_area_id TEXT REFERENCES public.admin_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT,
  ADD COLUMN IF NOT EXISTS transport_entity_id UUID REFERENCES public.transport_entities(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS admin_area_id TEXT REFERENCES public.admin_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transport_mode TEXT,
  ADD COLUMN IF NOT EXISTS transport_entity_id UUID REFERENCES public.transport_entities(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.content_geography (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('article','alert','report','campaign','infrastructure','feed')),
  content_id UUID NOT NULL,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  admin_area_id TEXT REFERENCES public.admin_areas(id) ON DELETE SET NULL,
  transport_entity_id UUID REFERENCES public.transport_entities(id) ON DELETE SET NULL,
  relationship_kind TEXT NOT NULL DEFAULT 'primary' CHECK (relationship_kind IN ('primary','related','mentioned')),
  provenance TEXT NOT NULL DEFAULT 'editor',
  verified BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_transport_modes (
  content_type TEXT NOT NULL CHECK (content_type IN ('article','alert','report','campaign','infrastructure','feed')),
  content_id UUID NOT NULL,
  transport_mode TEXT NOT NULL CHECK (transport_mode IN ('road','rail','aviation','maritime','inland_water','other')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (content_type, content_id, transport_mode)
);

CREATE UNIQUE INDEX IF NOT EXISTS content_transport_primary_uq
  ON public.content_transport_modes(content_type, content_id)
  WHERE is_primary;
CREATE UNIQUE INDEX IF NOT EXISTS content_geography_identity_uq
  ON public.content_geography(content_type, content_id, relationship_kind,
    COALESCE(country_code,''), COALESCE(admin_area_id,''),
    COALESCE(transport_entity_id,'00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS content_geography_area_idx ON public.content_geography(admin_area_id, content_type);
CREATE INDEX IF NOT EXISTS content_geography_entity_idx ON public.content_geography(transport_entity_id, content_type);
CREATE INDEX IF NOT EXISTS transport_entities_lookup_idx ON public.transport_entities(entity_type, country_code, name);
CREATE INDEX IF NOT EXISTS transport_entity_aliases_lookup_idx ON public.transport_entity_aliases(normalized_alias);

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['accident_reports','alerts','news','infrastructure_issues','campaigns'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname=table_name || '_country_code_ck') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (country_code IS NULL OR country_code ~ ''^[A-Z]{2}$'')', table_name, table_name || '_country_code_ck');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname=table_name || '_transport_mode_ck') THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (transport_mode IS NULL OR transport_mode IN (''road'',''rail'',''aviation'',''maritime'',''inland_water'',''other''))', table_name, table_name || '_transport_mode_ck');
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_incident_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_geography ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_transport_modes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.countries, public.admin_areas, public.transport_entities,
  public.transport_entity_aliases, public.transport_incident_types,
  public.content_geography, public.content_transport_modes FROM PUBLIC;
GRANT SELECT ON public.countries, public.admin_areas, public.transport_entities,
  public.transport_entity_aliases, public.transport_incident_types TO anon, authenticated;
GRANT SELECT ON public.content_geography, public.content_transport_modes TO authenticated;
GRANT ALL ON public.countries, public.admin_areas, public.transport_entities,
  public.transport_entity_aliases, public.transport_incident_types,
  public.content_geography, public.content_transport_modes TO service_role;

DROP POLICY IF EXISTS unified_countries_public_read ON public.countries;
CREATE POLICY unified_countries_public_read ON public.countries FOR SELECT USING (active);
DROP POLICY IF EXISTS unified_admin_areas_public_read ON public.admin_areas;
CREATE POLICY unified_admin_areas_public_read ON public.admin_areas FOR SELECT USING (active);
DROP POLICY IF EXISTS unified_entities_public_read ON public.transport_entities;
CREATE POLICY unified_entities_public_read ON public.transport_entities FOR SELECT USING (verified OR public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS unified_aliases_public_read ON public.transport_entity_aliases;
CREATE POLICY unified_aliases_public_read ON public.transport_entity_aliases FOR SELECT USING (verified OR public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS unified_incident_types_public_read ON public.transport_incident_types;
CREATE POLICY unified_incident_types_public_read ON public.transport_incident_types FOR SELECT USING (active);
DROP POLICY IF EXISTS unified_content_geography_editor_read ON public.content_geography;
CREATE POLICY unified_content_geography_editor_read ON public.content_geography FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS unified_content_modes_editor_read ON public.content_transport_modes;
CREATE POLICY unified_content_modes_editor_read ON public.content_transport_modes FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(),'editor'));

CREATE POLICY unified_countries_editor_write ON public.countries FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_countries_editor_update ON public.countries FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_admin_areas_editor_write ON public.admin_areas FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_admin_areas_editor_update ON public.admin_areas FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_entities_editor_write ON public.transport_entities FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_entities_editor_update ON public.transport_entities FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_aliases_editor_write ON public.transport_entity_aliases FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_aliases_editor_update ON public.transport_entity_aliases FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_content_geography_editor_write ON public.content_geography FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_content_geography_editor_update ON public.content_geography FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_content_modes_editor_write ON public.content_transport_modes FOR INSERT TO authenticated WITH CHECK (public.has_min_role(auth.uid(),'editor'));
CREATE POLICY unified_content_modes_editor_update ON public.content_transport_modes FOR UPDATE TO authenticated USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
