
-- ===== REPORT REVIEW WORKFLOW =====
ALTER TABLE public.accident_reports
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS editor_note TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

UPDATE public.accident_reports SET status = 'approved' WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS accident_reports_status_idx ON public.accident_reports (status, occurred_at DESC);

DROP POLICY IF EXISTS "reports_public_read" ON public.accident_reports;
CREATE POLICY "reports_read_approved" ON public.accident_reports FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
  );

DROP POLICY IF EXISTS "reports_update_own" ON public.accident_reports;
CREATE POLICY "reports_update_own" ON public.accident_reports FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND status <> 'approved')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
  )
  WITH CHECK (
    (auth.uid() = user_id AND status <> 'approved')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'moderator')
  );

DROP POLICY IF EXISTS "reports_delete_own" ON public.accident_reports;
CREATE POLICY "reports_delete_own" ON public.accident_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- allow anyone to see who holds a public byline role
DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.user_roles TO anon;
CREATE POLICY "user_roles_read_anon" ON public.user_roles FOR SELECT TO anon USING (true);

-- ===== EXTRA STATISTICS =====
ALTER TABLE public.yearly_stats
  ADD COLUMN IF NOT EXISTS registered_vehicles INTEGER,
  ADD COLUMN IF NOT EXISTS deaths_per_100k NUMERIC(6,2);

UPDATE public.yearly_stats SET registered_vehicles = 3_100_000, deaths_per_100k = 7.10 WHERE year = 2019;
UPDATE public.yearly_stats SET registered_vehicles = 3_320_000, deaths_per_100k = 7.10 WHERE year = 2020;
UPDATE public.yearly_stats SET registered_vehicles = 3_640_000, deaths_per_100k = 8.10 WHERE year = 2021;
UPDATE public.yearly_stats SET registered_vehicles = 3_980_000, deaths_per_100k = 8.70 WHERE year = 2022;
UPDATE public.yearly_stats SET registered_vehicles = 4_310_000, deaths_per_100k = 8.60 WHERE year = 2023;
UPDATE public.yearly_stats SET registered_vehicles = 4_690_000, deaths_per_100k = 8.60 WHERE year = 2024;
UPDATE public.yearly_stats SET registered_vehicles = 5_050_000, deaths_per_100k = 8.10 WHERE year = 2025;

ALTER TABLE public.county_stats
  ADD COLUMN IF NOT EXISTS serious_injuries INTEGER,
  ADD COLUMN IF NOT EXISTS population INTEGER;

CREATE TABLE IF NOT EXISTS public.monthly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  fatalities INTEGER NOT NULL,
  crashes INTEGER NOT NULL,
  UNIQUE (year, month)
);
GRANT SELECT ON public.monthly_stats TO anon, authenticated;
GRANT ALL ON public.monthly_stats TO service_role;
ALTER TABLE public.monthly_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_public_read" ON public.monthly_stats FOR SELECT USING (true);
CREATE POLICY "monthly_admin_write" ON public.monthly_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.cause_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cause TEXT NOT NULL,
  year INTEGER NOT NULL,
  share NUMERIC(5,2) NOT NULL,
  fatalities INTEGER NOT NULL,
  UNIQUE (cause, year)
);
GRANT SELECT ON public.cause_stats TO anon, authenticated;
GRANT ALL ON public.cause_stats TO service_role;
ALTER TABLE public.cause_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cause_public_read" ON public.cause_stats FOR SELECT USING (true);
CREATE POLICY "cause_admin_write" ON public.cause_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.vehicle_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  crashes INTEGER NOT NULL,
  fatalities INTEGER NOT NULL,
  UNIQUE (vehicle_type, year)
);
GRANT SELECT ON public.vehicle_stats TO anon, authenticated;
GRANT ALL ON public.vehicle_stats TO service_role;
ALTER TABLE public.vehicle_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicle_public_read" ON public.vehicle_stats FOR SELECT USING (true);
CREATE POLICY "vehicle_admin_write" ON public.vehicle_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.time_of_day_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  year INTEGER NOT NULL,
  fatalities INTEGER NOT NULL,
  UNIQUE (band, year)
);
GRANT SELECT ON public.time_of_day_stats TO anon, authenticated;
GRANT ALL ON public.time_of_day_stats TO service_role;
ALTER TABLE public.time_of_day_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tod_public_read" ON public.time_of_day_stats FOR SELECT USING (true);
CREATE POLICY "tod_admin_write" ON public.time_of_day_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.road_class_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  road_class TEXT NOT NULL,
  year INTEGER NOT NULL,
  fatalities INTEGER NOT NULL,
  crashes INTEGER NOT NULL,
  UNIQUE (road_class, year)
);
GRANT SELECT ON public.road_class_stats TO anon, authenticated;
GRANT ALL ON public.road_class_stats TO service_role;
ALTER TABLE public.road_class_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roadclass_public_read" ON public.road_class_stats FOR SELECT USING (true);
CREATE POLICY "roadclass_admin_write" ON public.road_class_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.monthly_stats (year, month, fatalities, crashes) VALUES
 (2025,1,392,1288),(2025,2,341,1140),(2025,3,368,1231),(2025,4,377,1252),
 (2025,5,349,1178),(2025,6,362,1205),(2025,7,388,1274),(2025,8,401,1310),
 (2025,9,371,1240),(2025,10,384,1266),(2025,11,398,1298),(2025,12,400,1308)
ON CONFLICT DO NOTHING;

INSERT INTO public.cause_stats (cause, year, share, fatalities) VALUES
 ('Speeding',2025,31.00,1405),
 ('Careless / dangerous overtaking',2025,18.00,816),
 ('Drink driving',2025,13.00,589),
 ('Pedestrian misjudgement',2025,11.00,498),
 ('Fatigue and night driving',2025,9.00,408),
 ('Vehicle defects',2025,8.00,362),
 ('Poor road condition / signage',2025,6.00,272),
 ('Other',2025,4.00,181)
ON CONFLICT DO NOTHING;

INSERT INTO public.vehicle_stats (vehicle_type, year, crashes, fatalities) VALUES
 ('Motorcycle (boda boda)',2025,5210,1585),
 ('Matatu / PSV',2025,2980,842),
 ('Private car',2025,3410,731),
 ('Lorry / trailer',2025,1980,690),
 ('Bus',2025,910,384),
 ('Tuk tuk',2025,540,142),
 ('Bicycle',2025,260,157)
ON CONFLICT DO NOTHING;

INSERT INTO public.time_of_day_stats (band, sort_order, year, fatalities) VALUES
 ('00:00-04:00',1,2025,552),('04:00-08:00',2,2025,701),('08:00-12:00',3,2025,588),
 ('12:00-16:00',4,2025,634),('16:00-20:00',5,2025,1104),('20:00-24:00',6,2025,952)
ON CONFLICT DO NOTHING;

INSERT INTO public.road_class_stats (road_class, year, fatalities, crashes) VALUES
 ('Class A (international trunk)',2025,1642,4820),
 ('Class B (national trunk)',2025,984,3120),
 ('Class C (primary)',2025,761,2540),
 ('Urban streets',2025,812,3410),
 ('Rural and unclassified',2025,332,1400)
ON CONFLICT DO NOTHING;
