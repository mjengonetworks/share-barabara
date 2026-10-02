import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAudit, extractExpectedObjects, unwrapAuditExport } from "../scripts/analyze-production-schema-audit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = fs.readFileSync(path.join(root, "supabase/inspection/production_schema_audit.sql"), "utf8");
const pending = fs.readFileSync(path.join(root, "PENDING.md"), "utf8");

test("inspection SQL returns one structured JSON result", () => {
  assert.match(sql, /SELECT\s+jsonb_build_object\(/i);
  assert.match(sql, /AS production_schema_audit/i);
  assert.match(sql, /supabase_migrations\.schema_migrations/);
  assert.doesNotMatch(sql, /^\s*(CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|TRUNCATE)\b/im);
});

test("inspection SQL covers all required PostgreSQL catalog areas", () => {
  for (const token of [
    "information_schema.columns", "pg_policies", "information_schema.triggers",
    "pg_proc", "pg_constraint", "pg_indexes", "role_table_grants",
    "role_routine_grants", "pg_extension", "pg_stat_user_tables",
  ]) assert.match(sql, new RegExp(token.replaceAll(".", "\\.")));
});

test("migration boundaries include known-applied and protected subscription entries", () => {
  assert.match(sql, /20260929120000_report_unknown_campaign_review\.sql/);
  assert.match(sql, /known_applied_do_not_replay/);
  assert.match(sql, /20260929130000_subscription_payments_schema_review\.sql/);
  assert.match(sql, /excluded_protected_do_not_execute/);
});

test("audit export can be unwrapped from a Supabase single-row result", () => {
  const audit = { audit: { version: "task53.v1" }, migration_history: [] };
  assert.deepEqual(unwrapAuditExport([{ production_schema_audit: audit }]), audit);
});

test("missing history is not mislabeled as unapplied", () => {
  const report = analyzeAudit({ audit: { version: "task53.v1" }, migration_history: [], object_presence: [] });
  assert.ok(report.migration_status.some((row) => row.status === "not_confirmed"));
  assert.ok(report.migration_status.every((row) => !/unapplied/i.test(row.status)));
});

test("object comparison reports absence as not confirmed and preserves source files", () => {
  const report = analyzeAudit({ audit: { version: "task53.v1" }, migration_history: [], object_presence: [] });
  assert.ok(report.object_checks.length > 0);
  assert.ok(report.object_checks.every((row) => row.status === "not_reported"));
  assert.ok(report.object_checks.every((row) => row.source_file.endsWith(".sql")));
});

test("repository migration parser recognizes review objects without executing SQL", () => {
  const objects = extractExpectedObjects("CREATE TABLE public.example_table (id uuid); CREATE INDEX example_idx ON public.example_table(id); CREATE POLICY example_policy ON public.example_table FOR SELECT USING (true);");
  assert.deepEqual(objects, [
    { kind: "table", name: "example_table" },
    { kind: "index", name: "example_idx" },
    { kind: "policy", name: "example_policy" },
  ]);
});

test("Task 53 bookkeeping remains verification-only", () => {
  assert.match(pending, /Task 53 — Supabase Production Database Verification is TESTING \/ VERIFICATION/);
  assert.match(pending, /No SQL was\s+executed/);
});
