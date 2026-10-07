import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const scorer = fs.readFileSync("src/lib/incident-duplicates.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261006110000_incident_duplicate_suggestions_review.sql", "utf8");
const panel = fs.readFileSync("src/components/site/incident-discovery-panel.tsx", "utf8");

test("cross-content duplicate suggestions are additive, staff-only and reviewable", () => {
  assert.match(migration, /incident_duplicate_suggestions/);
  assert.match(migration, /ALTER TABLE public\.incident_duplicate_suggestions ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /has_min_role\(auth\.uid\(\), 'editor'\)/);
  assert.match(migration, /status IN \('suggested','confirmed','not_duplicate','merged'\)/);
  assert.match(panel, /Confirm\/link/);
  assert.match(panel, /Not duplicate/);
});

test("scoring requires independent evidence and never treats unknown values as matches", () => {
  assert.match(scorer, /dateDistanceDays/);
  assert.match(scorer, /coordinateDistanceKm/);
  assert.match(scorer, /Missing date, location, coordinates and casualty values are neutral/);
  assert.match(scorer, /reasons\.length >= 2/);
  assert.match(scorer, /alerts/);
  assert.match(scorer, /accident_reports/);
  assert.match(scorer, /feed_posts/);
  assert.match(scorer, /incident_discovery_candidates/);
});

test("submission paths invoke duplicate review without making it a publication decision", () => {
  const report = fs.readFileSync("src/lib/report.functions.ts", "utf8");
  const alert = fs.readFileSync("src/lib/alert.functions.ts", "utf8");
  assert.match(report, /suggestIncidentDuplicates/);
  assert.match(alert, /suggestIncidentDuplicates/);
  assert.match(report, /catch/);
  assert.match(alert, /catch/);
  assert.doesNotMatch(report, /status:\s*["']approved["']/);
});
