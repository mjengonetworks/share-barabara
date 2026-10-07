-- TASK 31 REVIEW ONLY: optional Article location metadata and safe coordinate
-- constraints. Do not execute during development.
--
-- Alerts and accident_reports already have optional county, road, road_id,
-- latitude and longitude fields. Articles currently have no geographic fields;
-- these nullable columns add an explicit primary location without requiring
-- every Article to be geographic or inventing coordinates for old records.

ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS location_label TEXT,
  ADD COLUMN IF NOT EXISTS location_type TEXT,
  ADD COLUMN IF NOT EXISTS county TEXT,
  ADD COLUMN IF NOT EXISTS road TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

ALTER TABLE public.news
  ADD CONSTRAINT news_location_type_valid
  CHECK (location_type IS NULL OR location_type IN ('county', 'named_place', 'road', 'point', 'feature'));
ALTER TABLE public.news
  ADD CONSTRAINT news_coordinate_pair_valid
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL));
ALTER TABLE public.news
  ADD CONSTRAINT news_latitude_valid CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
ALTER TABLE public.news
  ADD CONSTRAINT news_longitude_valid CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

-- NOT VALID preserves existing historical rows while enforcing the contract
-- for new/updated Alert and Report rows. Existing invalid data must be audited
-- before these constraints are validated in a later maintenance action.
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_coordinate_pair_valid
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)) NOT VALID;
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_latitude_valid CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90) NOT VALID;
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_longitude_valid CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180) NOT VALID;
ALTER TABLE public.accident_reports
  ADD CONSTRAINT reports_coordinate_pair_valid
  CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)) NOT VALID;
ALTER TABLE public.accident_reports
  ADD CONSTRAINT reports_latitude_valid CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90) NOT VALID;
ALTER TABLE public.accident_reports
  ADD CONSTRAINT reports_longitude_valid CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180) NOT VALID;

CREATE INDEX IF NOT EXISTS news_location_county_idx ON public.news (county);
CREATE INDEX IF NOT EXISTS news_location_road_idx ON public.news (road);
CREATE INDEX IF NOT EXISTS alerts_coordinates_idx ON public.alerts (latitude, longitude);
CREATE INDEX IF NOT EXISTS reports_coordinates_idx ON public.accident_reports (latitude, longitude);

-- No PostGIS/geography column is introduced: the current application has no
-- approved geometry source or spatial provider. Task 27 continues to use its
-- existing bounded Haversine matching until that decision is made.
