import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Task 25 source operations stay additive, staff-scoped and evidence-first", () => {
  const sql = read("supabase/migrations/20261006100000_incident_source_operations_review.sql");
  assert.match(sql, /incident_monitor_sources/);
  assert.match(sql, /incident_monitor_runs/);
  assert.match(sql, /incident_discovery_candidates/);
  assert.match(sql, /has_min_role\(auth\.uid\(\), 'editor'\)/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS source_id/);
  assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test("discovery remains provider-neutral, bounded and draft-only", () => {
  const fn = read("src/lib/incident-discovery.functions.ts");
  const ui = read("src/routes/_authenticated/admin/incident-sources.tsx");
  assert.match(fn, /searchExternal/);
  assert.match(fn, /incident_discovery_candidates/);
  assert.match(fn, /source_id/);
  assert.match(fn, /duplicateScore/);
  assert.match(fn, /duplicate_of_report_id/);
  assert.match(ui, /never publishes an incident/);
  assert.match(ui, /incident_monitor_sources/);
  assert.doesNotMatch(fn, /auto.?publish|auto.?approve/i);
});
