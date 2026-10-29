import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("all legacy statistics tables share admin provenance and revision controls", () => {
  const migration = read("supabase/migrations/20261029150000_official_statistics_management_review.sql");
  const admin = read("src/routes/_authenticated/admin/crash-statistics.tsx");
  for (const table of ["yearly_stats", "monthly_stats", "county_stats", "victim_stats", "cause_stats", "vehicle_stats", "time_of_day_stats", "road_class_stats"]) {
    assert.match(migration, new RegExp(table));
  }
  assert.match(migration, /legacy_statistics_revisions/);
  assert.match(migration, /publication_status/);
  assert.match(admin, /PROVENANCE_COLUMNS/);
  assert.match(admin, /primaryKey: "year"/);
  assert.match(admin, /source_url/);
});

test("public Statistics selection drives legacy and selected-year incident displays", () => {
  const route = read("src/routes/statistics.tsx");
  assert.match(route, /Displayed reporting year/);
  assert.match(route, /monthly\.filter\(\(m\) => m\.year === activeYear\)/);
  assert.match(route, /useLiveYearReports\(liveTransportMode, activeYear\)/);
  assert.match(route, /publication_status/);
  assert.match(route, /Source not recorded/);
});
