import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { validateAuditExport } from "../scripts/import-production-schema-audit.mjs";

const reconciliation = fs.readFileSync("docs/production-database-migration-reconciliation.md", "utf8");
const readiness = fs.readFileSync("docs/production-database-migration-readiness.md", "utf8");

function validAudit() {
  const arrays = [
    "migration_history", "migration_targets", "object_presence", "dependency_checks",
    "tables", "columns", "rls_policies", "triggers", "functions", "constraints",
    "indexes", "table_grants", "routine_grants", "extensions",
  ];
  return {
    audit: { name: "share_barabara_production_schema_audit", read_only_statement: true },
    ...Object.fromEntries(arrays.map((field) => [field, []])),
  };
}

test("Task 59 records the validated audit while keeping execution blocked", () => {
  assert.match(reconciliation, /AUDIT COMPLETE — MIGRATION EXECUTION STILL BLOCKED/);
  assert.match(reconciliation, /Generated: `2026-10-02T17:00:59\.245302\+00:00`/);
  assert.match(reconciliation, /20260929120000_report_unknown_campaign_review\.sql/);
  assert.match(reconciliation, /do not replay/);
  assert.match(readiness, /Production\s+reconciliation is complete at the catalog-evidence level/);
});

test("Task 59 preserves the protected subscription boundary and ordered chain", () => {
  assert.match(reconciliation, /20260929130000_subscription_payments_schema_review\.sql/);
  assert.match(reconciliation, /PROTECTED \/ EXCLUDED/);
  for (const file of [
    "20260930100000_statistics_modernization_review.sql",
    "20260930110000_alert_notification_preferences_review.sql",
    "20260930150000_theft_vandalism_taxonomy_review.sql",
    "20260930160000_notification_customization_review.sql",
    "20261001100000_feed_community_review.sql",
    "20261001120000_recycle_bin_review.sql",
  ]) assert.match(reconciliation, new RegExp(file.replaceAll(".", "\\.")));
});

test("Task 59 importer validates raw and single-column audit exports", () => {
  const audit = validAudit();
  assert.equal(validateAuditExport(audit).audit.name, audit.audit.name);
  assert.equal(validateAuditExport([{ production_schema_audit: audit }]).audit.name, audit.audit.name);
  assert.equal(validateAuditExport({ data: [{ production_schema_audit: audit }] }).audit.name, audit.audit.name);
  assert.throws(() => validateAuditExport({ audit: { name: "wrong" } }), /not the Share Barabara/);
});

test("Task 59 does not authorize SQL execution or treat history absence as proof", () => {
  assert.match(reconciliation, /No SQL was executed/);
  assert.match(reconciliation, /history absence alone|history.*absence.*not/i);
  assert.match(reconciliation, /Rollback is not deletion of migration-history rows/);
});
