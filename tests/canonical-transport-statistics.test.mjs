import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync("supabase/migrations/20261028140000_canonical_transport_statistics_extension_review.sql", "utf8");
const canonical = readFileSync("supabase/migrations/20261028130000_canonical_accident_statistics_review.sql", "utf8");

test("transport extension is dependent, additive, and supports multimodal incidents", () => {
  assert.match(migration, /canonical_accident_incidents/);
  assert.match(migration, /canonical_incident_transport_modes/);
  assert.match(migration, /transport_mode IN \('road','rail','aviation','maritime','inland_water','other'\)/);
  assert.match(migration, /PRIMARY KEY \(incident_id, transport_mode\)/);
  assert.match(migration, /canonical_incident_primary_mode_uq/);
  assert.match(migration, /canonical accident migration must be applied first/);
});

test("classification RPC validates roles, geography, modes, and preserves null coordinates", () => {
  assert.match(migration, /canonical_set_incident_classification/);
  assert.match(migration, /has_min_role\(auth\.uid\(\),'moderator'\)/);
  assert.match(migration, /latitude and longitude must be supplied together/);
  assert.match(migration, /at least one transport mode is required/);
  assert.match(migration, /country_code must be an ISO alpha-2 code/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.canonical_set_incident_classification/);
});

test("public read models preserve one incident identity and map eligibility", () => {
  assert.match(migration, /canonical_transport_statistics/);
  assert.match(migration, /incident_id/);
  assert.match(migration, /public_canonical_transport_statistics/);
  assert.match(migration, /public_canonical_transport_map/);
  assert.match(migration, /s\.latitude IS NOT NULL AND s\.longitude IS NOT NULL/);
  assert.match(migration, /canonical_accident_statistics s/);
  assert.match(canonical, /incident_content_links/);
  assert.match(canonical, /r\.duplicate_of_report_id IS NULL/);
  assert.doesNotMatch(canonical, /CREATE TABLE public\.canonical_accident_sources/);
  assert.doesNotMatch(canonical, /CREATE OR REPLACE FUNCTION public\.canonical_link_alert_to_report/);
  assert.doesNotMatch(migration, /COALESCE\([^\n]*(fatalities|injuries|casualties)/i);
});

test("transport read RPCs are public only through security-definer functions", () => {
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.public_canonical_transport_statistics.*anon,authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.public_canonical_transport_map\(DATE,DATE,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT\).*anon,authenticated/);
  assert.match(migration, /REVOKE ALL ON public\.canonical_incident_transport_modes FROM PUBLIC, anon/);
});
