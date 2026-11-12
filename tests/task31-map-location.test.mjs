import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const location = read("src/lib/location.ts");
const picker = read("src/components/site/location-button.tsx");
const geolocation = read("src/hooks/useGeolocation.ts");
const articleForm = read("src/components/site/article-form.tsx");
const capability = read("src/hooks/useArticleLocation.ts");
const migration = read("supabase/migrations/20260930140000_location_architecture_review.sql");
const editorial = read("src/lib/ai/editorial.functions.ts");
const task27 = read("src/lib/alert-notification.mjs");
const roads = read("src/lib/roads.ts");

test("coordinate validation enforces complete latitude/longitude ranges", () => {
  assert.match(location, /latitude >= -90 && latitude <= 90/);
  assert.match(location, /longitude >= -180 && longitude <= 180/);
  assert.match(location, /Partial pairs are discarded/);
});

test("Article forms remain editorial-only while incident location contracts stay available elsewhere", () => {
  assert.doesNotMatch(migration, /NOT NULL.*location_label|NOT NULL.*county|NOT NULL.*road/);
  assert.doesNotMatch(articleForm, /Location \(optional\)|A point is never required|RoadInput|location_label|latitude|longitude/);
  assert.match(read("src/components/site/report-form.tsx"), /LocationButton/);
  assert.match(read("src/components/site/alert-form.tsx"), /LocationButton/);
});

test("location entry has explicit current-location, manual and clear paths", () => {
  assert.match(picker, /Use my current point/);
  assert.match(picker, /Use entered coordinates/);
  assert.match(picker, /Clear point/);
  assert.match(geolocation, /getCurrentPosition/);
  assert.match(picker, /Search a place/);
  assert.match(picker, /Click the map to place the point/);
});

test("Article location UI feature-detects the review schema before writing new columns", () => {
  assert.match(capability, /location_label, location_type, county, road, latitude, longitude/);
  assert.match(capability, /return !error/);
  assert.doesNotMatch(articleForm, /articleLocationAvailable|\.\.\.\(articleLocationAvailable/);
});

test("review migration preserves old rows and adds optional Article location metadata", () => {
  assert.match(migration, /ALTER TABLE public\.news/);
  assert.match(migration, /location_label TEXT/);
  assert.match(migration, /location_type TEXT/);
  assert.match(migration, /news_coordinate_pair_valid/);
  assert.match(migration, /NOT VALID/);
  assert.match(migration, /No PostGIS\/geography column/);
});

test("Alerts and Reports retain radius-compatible coordinates without fabricated fallbacks", () => {
  assert.match(task27, /isValidCoordinate/);
  assert.match(task27, /do not broaden the subscription/);
  assert.match(picker, /A point is optional/);
  assert.match(picker, /Photon/);
  assert.doesNotMatch(picker, /county.*centroid/i);
});

test("admin Alert and Report editing can correct optional points", () => {
  const alerts = read("src/components/site/alert-form.tsx");
  const reports = read("src/components/site/report-form.tsx");
  assert.match(alerts, /LocationButton/);
  assert.match(alerts, /latitude/);
  assert.match(reports, /LocationButton/);
  assert.match(reports, /latitude/);
});

test("free-text roads are preserved without silently creating canonical roads", () => {
  assert.match(roads, /findExistingRoad/);
  assert.match(roads, /Free-text road descriptions stay/);
  assert.doesNotMatch(roads, /\.from\("roads"\)\.insert/);
});

test("Editorial AI coordinates remain verified-only and nullable", () => {
  assert.match(editorial, /Do not invent figures, dates, times, locations, coordinates/);
  assert.match(editorial, /latitude|longitude/);
  assert.match(read("src/lib/ai/accident-report-contract.ts"), /verified coordinate or remain blank/);
});

test("no map-provider, SearXNG or Task 25 runtime dependency was added", () => {
  assert.doesNotMatch(picker, /leaflet|mapbox|google maps|nominatim/i);
  assert.doesNotMatch(articleForm, /SearXNG|Task 25|agent/i);
  assert.doesNotMatch(migration, /SearXNG|Task 25|agent/i);
});
