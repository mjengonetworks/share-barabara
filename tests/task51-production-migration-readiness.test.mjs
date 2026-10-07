import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const doc = fs.readFileSync(new URL("../docs/production-database-migration-readiness.md", import.meta.url), "utf8");
const pending = fs.readFileSync(new URL("../PENDING.md", import.meta.url), "utf8");

test("Task 51 documents unavailable privileged live access without exposing credentials", () => {
  assert.match(doc, /no database connection URL,\s+service-role key/i);
  assert.match(doc, /No production request was made/);
  assert.doesNotMatch(doc, /eyJ[A-Za-z0-9_-]{20,}/);
});

test("known report migration is explicitly excluded from replay", () => {
  assert.match(doc, /20260929120000_report_unknown_campaign_review\.sql/);
  assert.match(doc, /Do not schedule that file for execution again/);
});

test("protected subscription migration is kept separate", () => {
  assert.match(doc, /20260929130000_subscription_payments_schema_review\.sql/);
  assert.match(doc, /protected, separate, and excluded/);
});

test("task migrations have a dependency-aware order", () => {
  const order = [
    "20260930100000_statistics_modernization_review.sql",
    "20260930110000_alert_notification_preferences_review.sql",
    "20260930130000_admin_taxonomy_review.sql",
    "20260930150000_theft_vandalism_taxonomy_review.sql",
    "20260930160000_notification_customization_review.sql",
    "20260930170000_push_delivery_reliability_review.sql",
    "20261001100000_feed_community_review.sql",
    "20261001110000_release_blocker_remediation_review.sql",
    "20261001120000_recycle_bin_review.sql",
  ];
  let previous = -1;
  for (const name of order) {
    const next = doc.indexOf(name);
    assert.ok(next > previous, `${name} must follow its dependencies`);
    previous = next;
  }
});

test("inspection queries cover history, schema, RLS, triggers, functions and grants", () => {
  for (const token of ["schema_migrations", "information_schema.columns", "pg_policies", "information_schema.triggers", "pg_proc", "pg_constraint", "pg_indexes", "role_table_grants"]) {
    assert.match(doc, new RegExp(token.replace(/[.]/g, "\\.")));
  }
});

test("Task 50 visibility and security gates are called out", () => {
  assert.match(doc, /deleted_at/);
  assert.match(doc, /soft-deleted rows could remain publicly visible/);
  assert.match(doc, /SECURITY DEFINER/);
  assert.match(doc, /owner\/admin checks/);
});

test("Task 51 remains verification-only", () => {
  assert.match(pending, /Task 51 — Production Database Migration Readiness is TESTING \/ VERIFICATION/);
  assert.match(doc, /No SQL was executed by Codex/);
  assert.match(doc, /blocked pending privileged read-only\s+inspection/);
});
