
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','moderator','member');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Road user',
  county TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1), 'Road user'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- NEWS
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  source TEXT,
  image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO anon, authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_public_read" ON public.news FOR SELECT USING (true);
CREATE POLICY "news_admin_write" ON public.news FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER news_touch BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ALERTS
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  county TEXT NOT NULL,
  road TEXT,
  hazard_type TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.alerts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_public_read" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "alerts_insert_own" ON public.alerts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON public.alerts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "alerts_delete_own" ON public.alerts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER alerts_touch BEFORE UPDATE ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ACCIDENT REPORTS
CREATE TABLE public.accident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  county TEXT NOT NULL,
  road TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  vehicles_involved INTEGER NOT NULL DEFAULT 1,
  casualties INTEGER NOT NULL DEFAULT 0,
  fatalities INTEGER NOT NULL DEFAULT 0,
  severity TEXT NOT NULL DEFAULT 'moderate',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accident_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accident_reports TO authenticated;
GRANT ALL ON public.accident_reports TO service_role;
ALTER TABLE public.accident_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_public_read" ON public.accident_reports FOR SELECT USING (true);
CREATE POLICY "reports_insert_own" ON public.accident_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reports_update_own" ON public.accident_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "reports_delete_own" ON public.accident_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.accident_reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- COMMENTS
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_entity_idx ON public.comments (entity_type, entity_id, created_at DESC);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER comments_touch BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- STATISTICS
CREATE TABLE public.yearly_stats (
  year INTEGER PRIMARY KEY,
  fatalities INTEGER NOT NULL,
  serious_injuries INTEGER NOT NULL,
  slight_injuries INTEGER NOT NULL,
  crashes INTEGER NOT NULL
);
GRANT SELECT ON public.yearly_stats TO anon, authenticated;
GRANT ALL ON public.yearly_stats TO service_role;
ALTER TABLE public.yearly_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yearly_public_read" ON public.yearly_stats FOR SELECT USING (true);
CREATE POLICY "yearly_admin_write" ON public.yearly_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.county_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county TEXT NOT NULL,
  year INTEGER NOT NULL,
  fatalities INTEGER NOT NULL,
  crashes INTEGER NOT NULL,
  UNIQUE (county, year)
);
GRANT SELECT ON public.county_stats TO anon, authenticated;
GRANT ALL ON public.county_stats TO service_role;
ALTER TABLE public.county_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "county_public_read" ON public.county_stats FOR SELECT USING (true);
CREATE POLICY "county_admin_write" ON public.county_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.victim_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  year INTEGER NOT NULL,
  fatalities INTEGER NOT NULL,
  UNIQUE (category, year)
);
GRANT SELECT ON public.victim_stats TO anon, authenticated;
GRANT ALL ON public.victim_stats TO service_role;
ALTER TABLE public.victim_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "victim_public_read" ON public.victim_stats FOR SELECT USING (true);
CREATE POLICY "victim_admin_write" ON public.victim_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SEED
INSERT INTO public.yearly_stats (year, fatalities, serious_injuries, slight_injuries, crashes) VALUES
 (2019, 3587, 6134, 5321, 12480),
 (2020, 3665, 6482, 5590, 12934),
 (2021, 4271, 7112, 6003, 14210),
 (2022, 4690, 7681, 6410, 15021),
 (2023, 4690, 7995, 6612, 15488),
 (2024, 4748, 8120, 6740, 15803),
 (2025, 4531, 7860, 6552, 15290);

INSERT INTO public.county_stats (county, year, fatalities, crashes) VALUES
 ('Nairobi', 2025, 712, 2410),
 ('Kiambu', 2025, 388, 1290),
 ('Nakuru', 2025, 341, 1105),
 ('Machakos', 2025, 297, 940),
 ('Kajiado', 2025, 264, 812),
 ('Mombasa', 2025, 218, 760),
 ('Uasin Gishu', 2025, 176, 604),
 ('Kisumu', 2025, 163, 555),
 ('Nyeri', 2025, 141, 470),
 ('Kilifi', 2025, 138, 449);

INSERT INTO public.victim_stats (category, year, fatalities) VALUES
 ('Pedestrians', 2025, 1596),
 ('Motorcyclists', 2025, 1420),
 ('Passengers', 2025, 856),
 ('Pillion passengers', 2025, 402),
 ('Drivers', 2025, 187),
 ('Pedal cyclists', 2025, 70);

INSERT INTO public.news (slug, title, summary, body, category, source, featured, published_at) VALUES
 ('ntsa-launches-festive-crackdown',
  'NTSA launches nationwide crackdown on night-time speeding',
  'Traffic officers and NTSA inspectors will run 24-hour highway patrols on the Nairobi-Nakuru, Thika and Mombasa roads.',
  E'The National Transport and Safety Authority has rolled out a nationwide enforcement operation targeting night-time speeding, unroadworthy public service vehicles and drink-driving.\n\nMobile speed cameras will be deployed along the Nairobi-Nakuru highway, Thika Superhighway and the Mombasa Road corridor, with breathalyser checkpoints operating between 8pm and 4am.\n\nOperators found running vehicles without functional speed limiters or with expired inspection certificates risk immediate suspension of their licences. NTSA is urging passengers to report reckless driving through the toll-free hotline rather than staying silent.',
  'Enforcement', 'NTSA', true, now() - interval '2 days'),
 ('boda-boda-helmet-rules-tightened',
  'New rules require reflective jackets and certified helmets for all boda boda riders',
  'Motorcycle riders and pillion passengers must wear standards-certified helmets, with county enforcement starting immediately.',
  E'Motorcycle crashes now account for close to a third of all road deaths in Kenya. Under the tightened rules, both rider and pillion passenger must wear a helmet bearing the Kenya Bureau of Standards mark, and riders must wear reflective jackets displaying their registration number.\n\nCounty governments have been asked to register all riders operating within their boundaries and to link registration to mandatory road safety training.\n\nSafety groups welcomed the move but warned that enforcement must be paired with better street lighting and dedicated motorcycle lanes on busy corridors.',
  'Policy', 'Ministry of Roads and Transport', true, now() - interval '5 days'),
 ('black-spot-mapping-programme',
  'Engineers map 187 black spots for redesign across Kenyan highways',
  'A joint KeNHA and NTSA audit has identified 187 high-risk locations scheduled for redesign over the next two years.',
  E'A joint road safety audit has identified 187 black spots across the national trunk road network, including notorious stretches at Salgaa, Sachangwan, Nithi Bridge and the Mai Mahiu escarpment.\n\nPlanned interventions include rumble strips, arrester beds on steep descents, improved signage, better lighting and pedestrian footbridges near schools and markets.\n\nEngineers say that low-cost measures such as median barriers and shoulder rumble strips typically cut fatal crashes at a black spot by a third within the first year.',
  'Infrastructure', 'KeNHA', false, now() - interval '9 days'),
 ('school-zone-safety-campaign',
  'School zone safety campaign targets pedestrian deaths among children',
  'Pedestrians remain the single largest group of road deaths in Kenya, and children are heavily represented.',
  E'A new campaign is placing marshals, speed humps and 30km/h zones outside primary schools in urban centres.\n\nPedestrians account for roughly a third of all road fatalities in Kenya. Around schools, the danger peaks between 6.30am and 8am and again between 4pm and 6pm.\n\nParents are being asked to walk younger children to crossing points, while drivers are reminded that a pedestrian struck at 50km/h is far more likely to die than one struck at 30km/h.',
  'Awareness', 'Road Safety Coalition', false, now() - interval '14 days'),
 ('breathalyser-results-first-quarter',
  'Alcohol testing results show one in nine night drivers over the limit',
  'Roadside breath tests carried out on weekend nights found a high rate of impaired driving in urban centres.',
  E'Roadside breath testing carried out over several weekends found that about eleven percent of drivers stopped after 10pm were over the legal blood alcohol limit.\n\nThe highest rates were recorded in Nairobi, Kisumu and Nakuru. Officers say most offenders were private car drivers rather than public service vehicle crews.\n\nDrivers are reminded that the penalty for driving under the influence includes a fine, licence suspension and possible imprisonment.',
  'Enforcement', 'NTSA', false, now() - interval '21 days');
