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

test("county-only, road-only and text locations remain valid", () => {
  assert.doesNotMatch(migration, /NOT NULL.*location_label|NOT NULL.*county|NOT NULL.*road/);
  assert.match(articleForm, /Location \(optional\)/);
  assert.match(articleForm, /A point is never required/);
  assert.match(articleForm, /RoadInput/);
});

test("location entry has explicit current-location, manual and clear paths", () => {
  assert.match(picker, /Use my current point/);
  assert.match(picker, /Use entered coordinates/);
  assert.match(picker, /Clear point/);
  assert.match(geolocation, /getCurrentPosition/);
  assert.match(picker, /Map selection will be enabled/);
});

test("Article location UI feature-detects the review schema before writing new columns", () => {
  assert.match(capability, /location_label, location_type, county, road, latitude, longitude/);
  assert.match(capability, /return !error/);
  assert.match(articleForm, /articleLocationAvailable/);
  assert.match(articleForm, /\.\.\.\(articleLocationAvailable/);
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
  assert.doesNotMatch(picker, /county.*centroid|geocod/i);
});

test("admin Alert and Report editing can correct optional points", () => {
  const alerts = read("src/routes/_authenticated/admin/alerts.tsx");
  const reports = read("src/routes/_authenticated/admin/reports.tsx");
  assert.match(alerts, /LocationButton/);
  assert.match(alerts, /latitude: editingParties\.latitude/);
  assert.match(reports, /LocationButton/);
  assert.match(reports, /latitude: number \| null/);
});

test("free-text roads are preserved without silently creating canonical roads", () => {
  assert.match(roads, /findExistingRoad/);
  assert.match(roads, /Free-text road descriptions stay/);
  assert.doesNotMatch(roads, /\.from\("roads"\)\.insert/);
});

test("Editorial AI cannot populate coordinates", () => {
  assert.match(editorial, /Do not invent figures, dates, times, locations, coordinates/);
  assert.doesNotMatch(editorial, /latitude|longitude|geocode/i);
});

test("no map-provider, SearXNG or Task 25 runtime dependency was added", () => {
  assert.doesNotMatch(picker, /leaflet|mapbox|google maps|nominatim/i);
  assert.doesNotMatch(articleForm, /SearXNG|Task 25|agent/i);
  assert.doesNotMatch(migration, /SearXNG|Task 25|agent/i);
});
