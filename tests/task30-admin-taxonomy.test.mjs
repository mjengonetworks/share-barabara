import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const route = read("src/routes/_authenticated/admin/categories.tsx");
const migration = read("supabase/migrations/20260930130000_admin_taxonomy_review.sql");
const taxonomy = read("src/hooks/useTaxonomy.ts");
const pageTaxonomy = read("src/hooks/usePageCategories.ts");
const adminNav = read("src/routes/_authenticated/admin/route.tsx");
const alertMatching = read("src/lib/alert-notification.mjs");
const editorial = read("src/lib/ai/editorial.functions.ts");

test("Task 30 uses the existing taxonomy tables and stable machine values", () => {
  for (const table of ["news_categories", "hazard_types", "alert_severities", "report_severities", "page_categories"]) {
    assert.match(route, new RegExp(table));
  }
  assert.match(route, /Machine values are stable identifiers/);
  assert.match(route, /stored name is a stable value/);
  assert.match(route, /replace\(/);
});

test("taxonomy administration is editor-level and exposes no destructive delete UI", () => {
  assert.match(route, /ROLE_RANK\.editor/);
  assert.match(route, /canManage/);
  assert.doesNotMatch(route, /\.delete\(/);
  assert.match(route, /Archive/);
  assert.match(route, /Restore/);
  assert.match(migration, /deliberately no DELETE/);
  assert.match(migration, /DROP POLICY IF EXISTS "page_categories_admin_delete"/);
});

test("review migration preserves text references while adding lifecycle and label support", () => {
  for (const table of ["news_categories", "page_categories", "hazard_types", "alert_severities", "report_severities"]) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table}`));
    assert.match(migration, new RegExp(`${table}.*active BOOLEAN`, "s"));
  }
  assert.match(migration, /ADD COLUMN IF NOT EXISTS label TEXT/);
  assert.doesNotMatch(migration, /FOREIGN KEY|REFERENCES public\.(news|alerts|accident_reports|pages)/);
  assert.match(migration, /has_min_role\(auth\.uid\(\), 'editor'\)/);
});

test("public taxonomy hooks remain safe before and after the review migration", () => {
  assert.match(taxonomy, /row\.active !== false/);
  assert.match(pageTaxonomy, /active.*!== false/);
  assert.doesNotMatch(taxonomy, /\.eq\("active", true\)/);
  assert.doesNotMatch(pageTaxonomy, /\.eq\("active", true\)/);
});

test("admin navigation points to one taxonomy surface", () => {
  assert.match(adminNav, /to: "\/admin\/categories"/);
  assert.match(adminNav, /label: "Taxonomy"/);
});

test("alert notification matching continues to use stable hazard and severity values", () => {
  assert.match(alertMatching, /hazardTypes/);
  assert.match(alertMatching, /alert\.hazard_type/);
  assert.match(alertMatching, /severities/);
  assert.match(alertMatching, /alert\.severity/);
});

test("Editorial AI receives and validates active controlled taxonomy values", () => {
  assert.match(editorial, /controlledValues/);
  assert.match(editorial, /hazard_types/);
  assert.match(editorial, /alert_severities/);
  assert.match(editorial, /report_severities/);
  assert.match(editorial, /assertControlledDraftValues/);
  assert.match(editorial, /unsupported \$\{field\}/);
});

test("workflow, role and subscription concepts are excluded from the taxonomy editor", () => {
  assert.match(route, /Workflow statuses, roles, permissions, verification and subscription tiers/);
  assert.doesNotMatch(route, /subscription_payments|user_roles.*insert|status.*insert/);
});

test("Task 30 has no SearXNG or Task 25 runtime dependency", () => {
  assert.doesNotMatch(route, /SearXNG|Task 25|agent/i);
  assert.doesNotMatch(migration, /SearXNG|agent/i);
});
