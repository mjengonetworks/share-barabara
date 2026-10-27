import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const migration = readFileSync("supabase/migrations/20261027120000_cross_content_editorial_relationships.sql", "utf8");
const panel = readFileSync("src/components/site/cross-content-editor.tsx", "utf8");

test("cross-content migration is additive and covers the approved content model", () => {
  for (const table of ["editorial_conversion_targets", "editorial_tags", "editorial_content_tags", "editorial_content_relationships", "editorial_related_drafts", "editorial_generation_events"]) {
    assert.match(migration, new RegExp(`CREATE TABLE public\\.${table}`));
  }
  assert.match(migration, /source_snapshot_hash/);
  assert.match(migration, /generation_request_id/);
  assert.match(migration, /UNIQUE\(source_type,source_id,target_type,target_id,relationship_type\)/);
  assert.match(migration, /ON CONFLICT \(created_by,source_type,source_id,target_type,source_snapshot_hash\)/);
});

test("cross-content RPCs enforce permissions, validation, and public filtering", () => {
  for (const fn of ["editorial_register_related_draft", "editorial_link_content", "editorial_unlink_content", "editorial_update_related_draft", "editorial_assign_tag", "editorial_remove_tag", "editorial_public_related_content"]) {
    assert.match(migration, new RegExp(`FUNCTION public\\.${fn}`));
  }
  assert.match(migration, /editorial_can_edit_content/);
  assert.match(migration, /editorial_content_is_public/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.editorial_public_related_content/);
});

test("admin integration exposes one shared cross-content editor", () => {
  for (const route of ["articles.tsx", "reports.tsx", "alerts.tsx", "campaigns.tsx", "infrastructure-issues.tsx"]) {
    const source = readFileSync(`src/routes/_authenticated/admin/${route}`, "utf8");
    assert.match(source, /CrossContentEditor/);
  }
  assert.match(panel, /Generate related draft/);
  assert.match(panel, /Save related draft/);
  assert.match(panel, /editorial_link_content/);
  assert.match(panel, /editorial_assign_tag/);
});

test("public detail pages consume the shared related-content renderer", () => {
  for (const route of ["news.$slug.tsx", "reports.$reportId.tsx", "alerts.$alertId.tsx", "campaigns.$slug.tsx", "infrastructure-issues.$issueId.tsx"]) {
    const source = readFileSync(`src/routes/${route}`, "utf8");
    assert.match(source, /RelatedContent/);
  }
});
