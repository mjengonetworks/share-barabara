import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const migration = read("supabase/migrations/20260930150000_theft_vandalism_taxonomy_review.sql");
const taxonomy = read("src/lib/incident-taxonomy.ts");
const alertForm = read("src/components/site/alert-form.tsx");
const reportForm = read("src/components/site/report-form.tsx");
const reports = read("src/routes/reports.index.tsx");
const alerts = read("src/routes/alerts.index.tsx");
const search = read("src/routes/search.tsx");
const editorial = read("src/lib/ai/editorial.functions.ts");
const admin = read("src/routes/_authenticated/admin/categories.tsx");
const task27 = read("src/lib/alert-notification.mjs");
const task41 = read("src/components/site/discovery-sections.tsx");

test("Task 43 seeds stable Theft and Vandalism families and supported subtypes", () => {
  for (const value of [
    "theft",
    "vehicle_theft",
    "motorcycle_theft",
    "road_furniture_theft",
    "vandalism",
    "road_furniture_vandalism",
  ]) assert.match(migration, new RegExp(`'${value}'`));
  assert.match(migration, /parent_value TEXT/);
  assert.match(migration, /parent_name TEXT/);
  assert.match(taxonomy, /TASK43_INCIDENT_VALUES/);
  assert.match(taxonomy, /descendantsOf/);
  assert.match(taxonomy, /parent_value/);
});

test("Theft and Vandalism remain distinct, with optional subtype and independent severity", () => {
  assert.match(migration, /incident_type TEXT/);
  assert.match(migration, /NULL means/);
  assert.match(reportForm, /Incident classification \(optional\)/);
  assert.match(reportForm, /does not determine severity/);
  assert.match(taxonomy, /THEFT_VALUE/);
  assert.match(taxonomy, /VANDALISM_VALUE/);
});

test("Alert, Report and Article paths preserve existing storage compatibility", () => {
  assert.match(alertForm, /useIncidentTaxonomy/);
  assert.match(alertForm, /parent_value/);
  assert.match(reports, /incident\?: string/);
  assert.match(reports, /descendantsOf/);
  assert.match(reportForm, /useReportIncidentTypeSchema/);
  assert.match(reportForm, /reportIncidentTypeAvailable/);
  assert.match(migration, /Existing content values are deliberately not rewritten/);
  assert.match(migration, /ON CONFLICT \(value\) DO NOTHING/);
  assert.match(migration, /ON CONFLICT \(name\) DO NOTHING/);
});

test("Editorial AI is constrained by active taxonomy and does not invent subtypes", () => {
  assert.match(editorial, /newsCategories/);
  assert.match(editorial, /incident_type/);
  assert.match(editorial, /active.*false/);
  assert.match(editorial, /unsupported \$\{field\}/);
  assert.match(editorial, /do not invent a theft or vandalism subtype/);
});

test("public discovery and future notification matching retain their existing contracts", () => {
  assert.match(alerts, /descendantsOf/);
  assert.match(task27, /preference\.hazard_types|hazardTypes/);
  assert.match(task41, /alerts|reports|articles/);
  assert.match(search, /category\.ilike/);
  assert.match(admin, /stable identifiers/);
  assert.doesNotMatch(task27, /incident_type|road_furniture_theft/);
});

test("deferred subtypes and protected dependencies are explicit", () => {
  assert.match(migration, /road_furniture/);
  assert.doesNotMatch(migration, /bicycle_theft|cargo_theft|guardrail_theft|traffic_light_vandalism/);
  assert.doesNotMatch(migration, /SearXNG|Task 25|agent/i);
  assert.doesNotMatch(editorial, /Generate = Groq|Auto-Populate = Grok/);
});
