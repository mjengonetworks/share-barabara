import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Reports and Alerts use independent editorial featured selections", () => {
  const reports = read("src/routes/reports.index.tsx");
  const alerts = read("src/routes/alerts.index.tsx");
  assert.match(reports, /featured\?\.featured|featured\?\: boolean|featured\)\)\.featured/);
  assert.match(reports, /title=\"Featured Accident Reports\"/);
  assert.match(alerts, /title=\"Featured Alerts\"/);
  assert.doesNotMatch(reports, /critical\|high.*featured|featured = reports\.filter\(\(r\) => \/critical/);
  assert.doesNotMatch(alerts, /Important \/ Critical Alerts/);
});

test("Submission cards share a three-column row with selected featured records", () => {
  const reports = read("src/routes/reports.index.tsx");
  const alerts = read("src/routes/alerts.index.tsx");
  assert.match(reports, /featured\.length >= 2[\s\S]*lg:grid-cols-3[\s\S]*reportSubmissionCard/);
  assert.match(alerts, /featured\.length >= 2[\s\S]*lg:grid-cols-3[\s\S]*hazardSubmissionCard/);
});

test("Public detail view tracking is session-deduplicated for all content types", () => {
  const helper = read("src/lib/view-tracking.ts");
  assert.match(helper, /sessionStorage/);
  assert.match(helper, /memoryDedupe/);
  for (const file of ["src/routes/news.$slug.tsx", "src/routes/reports.$reportId.tsx", "src/routes/alerts.$alertId.tsx"]) {
    assert.match(read(file), /recordPublicView/);
    assert.doesNotMatch(read(file), /from\(\"(?:news_views|accident_report_views|alert_views)\"\)\.insert/);
  }
});

test("Featured selection migration is additive and keeps existing eligibility policies authoritative", () => {
  const migration = read("supabase/migrations/20261029170000_public_incident_featured_selection_review.sql");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /accident_reports_featured_idx/);
  assert.match(migration, /alerts_featured_idx/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE public\.(accident_reports|alerts)/);
});
