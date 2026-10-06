import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20261006120000_incident_source_scheduler_review.sql", "utf8");
const worker = fs.readFileSync("src/server.ts", "utf8");
const executor = fs.readFileSync("src/lib/incident-monitor.server.ts", "utf8");
const admin = fs.readFileSync("src/routes/_authenticated/admin/incident-sources.tsx", "utf8");

test("source scheduling is due-based, bounded and concurrency-safe", () => {
  assert.match(migration, /next_check_at/);
  assert.match(migration, /check_interval_minutes/);
  assert.match(migration, /FOR UPDATE SKIP LOCKED/);
  assert.match(migration, /incident_monitor_runs_one_active_source_idx/);
  assert.match(migration, /bounded_limit/);
  assert.match(worker, /runDueIncidentMonitorSources\(3\)/);
});

test("source execution fails closed and records lifecycle/retry state", () => {
  assert.match(executor, /external_search_unavailable/);
  assert.match(executor, /external_search_unavailable/);
  assert.match(executor, /candidates_created/);
  assert.match(executor, /consecutive_failures/);
  assert.match(executor, /retryAt/);
  assert.match(executor, /suggestIncidentDuplicates/);
});

test("manual source checks use the same server execution path and staff UI exposes operations", () => {
  assert.match(fs.readFileSync("src/lib/incident-discovery.functions.ts", "utf8"), /executeIncidentMonitorRun/);
  assert.match(fs.readFileSync("src/lib/incident-discovery.functions.ts", "utf8"), /Incident discovery requires an editor role/);
  assert.match(admin, /Next eligible/);
  assert.match(admin, /consecutive_failures/);
  assert.match(admin, /Check source now/);
});
