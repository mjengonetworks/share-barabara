import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync("supabase/migrations/20261027120000_cross_content_editorial_relationships.sql", "utf8");
const panel = readFileSync("src/components/site/cross-content-editor.tsx", "utf8");
const preflight = readFileSync("supabase/inspection/cross-content-production-preflight.sql", "utf8");

test("cross-content migration is additive and covers the approved content model", () => {
  for (const table of ["editorial_conversion_targets", "editorial_tags", "editorial_content_tags", "editorial_content_relationships", "editorial_related_drafts", "editorial_generation_events"]) {
    assert.match(migration, new RegExp(`CREATE TABLE public\\.${table}`));
  }
  assert.match(migration, /source_snapshot_hash/);
  assert.match(migration, /generation_request_id/);
  assert.match(migration, /CREATE UNIQUE INDEX editorial_relationships_active_uq/);
  assert.match(migration, /ON CONFLICT \(source_type,source_id,target_type,source_snapshot_hash\) WHERE status='open'/);
});

test("production preflight is read-only and covers schema, RLS, dependencies, and history", () => {
  assert.match(preflight, /information_schema\.columns/);
  assert.match(preflight, /pg_policies/);
  assert.match(preflight, /pg_proc/);
  assert.match(preflight, /supabase_migrations\.schema_migrations/);
  assert.match(preflight, /migration_dependencies/);
  assert.match(preflight, /production_migration_required/);
  assert.match(preflight, /ROLLBACK;/);
  assert.doesNotMatch(preflight, /supabase db push|CREATE TABLE public\./);
});

test("cross-content RPCs enforce permissions, validation, and public filtering", () => {
  for (const fn of ["editorial_register_related_draft", "editorial_link_content", "editorial_unlink_content", "editorial_update_related_draft", "editorial_finalize_related_draft", "editorial_assign_tag", "editorial_remove_tag", "editorial_public_related_content"]) {
    assert.match(migration, new RegExp(`FUNCTION public\\.${fn}`));
  }
  assert.match(migration, /editorial_can_edit_content/);
  assert.match(migration, /editorial_content_is_public/);
  assert.match(migration, /target visibility or edit permission required/);
  assert.match(migration, /has_min_role\(auth\.uid\(\),'editor'\).*editorial_can_edit_content/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.editorial_public_related_content/);
});

test("admin integration exposes one shared cross-content editor", () => {
  const editor = readFileSync("src/components/admin/editorial-record-editor.tsx", "utf8");
  assert.match(editor, /import \{ CrossContentEditor \}/);
  assert.match(editor, /<CrossContentEditor sourceType=\{type\} sourceId=\{id\}/);
  for (const route of ["articles.tsx", "reports.tsx", "alerts.tsx", "campaigns.tsx", "infrastructure-issues.tsx"]) {
    const source = readFileSync(`src/routes/_authenticated/admin/${route}`, "utf8");
    assert.match(source, /admin\/.*(?:new|\$.*edit)|Outlet/);
  }
  assert.match(panel, /Generate related draft/);
  assert.match(panel, /Save related draft/);
  assert.match(panel, /editorial_link_content/);
  assert.match(panel, /editorial_assign_tag/);
  assert.match(panel, /editorial-content-tags/);
  assert.match(panel, /editorial_remove_tag/);
  assert.match(panel, /Remove tag/);
  assert.match(panel, /editorial-related-drafts/);
  assert.match(panel, /Search related content/);
  assert.match(panel, /saved.generated_draft/);
  assert.match(panel, /editorial_finalize_related_draft/);
  assert.match(panel, /Link saved target/);
});

test("public detail pages consume the shared related-content renderer", () => {
  for (const route of ["news.$slug.tsx", "reports.$reportId.tsx", "alerts.$alertId.tsx", "campaigns.$slug.tsx", "infrastructure-issues.$issueId.tsx"]) {
    const source = readFileSync(`src/routes/${route}`, "utf8");
    assert.match(source, /RelatedContent/);
  }
});
