import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const migration = read("supabase/migrations/20261030180000_editorial_content_relationships_review.sql");
const editor = read("src/components/site/cross-content-editor.tsx");
const related = read("src/components/site/related-content.tsx");
const admin = read("src/components/admin/editorial-record-editor.tsx");

test("generic relationship migration preserves the canonical incident-link authority", () => {
  assert.match(migration, /incident_content_links/);
  assert.match(migration, /editorial_content_relationships/);
  assert.match(migration, /editorial_content_relationship_history/);
  assert.match(migration, /editorial_create_related_draft_record/);
  assert.match(migration, /Alert to Accident Report links must use incident_content_links/);
  assert.match(migration, /deleted_at IS NULL/);
  assert.match(migration, /editorial_relationships_active_uq/);
  assert.match(migration, /source_type.*feed_post/);
});

test("generic relationship RPCs enforce editor permissions, endpoint validation and audit history", () => {
  assert.match(migration, /editorial_can_edit_content/);
  assert.match(migration, /editorial_content_is_public/);
  assert.match(migration, /unknown editorial relationship endpoint/);
  assert.match(migration, /audit_editorial_relationship_change/);
  assert.match(migration, /audit_editorial_relationship_removal/);
  assert.match(migration, /relationship_history_editor_read/);
});

test("admin editor exposes bidirectional related-content and conversion workflow", () => {
  assert.match(admin, /CrossContentEditor/);
  assert.match(editor, /editorial_link_content/);
  assert.match(editor, /editorial_unlink_content/);
  assert.match(editor, /editorial_register_related_draft/);
  assert.match(editor, /editorial_update_related_draft/);
  assert.match(editor, /editorial_finalize_related_draft/);
  assert.match(editor, /editorial_create_related_draft_record/);
  assert.match(editor, /Save as new draft/);
  assert.match(editor, /provider: "grok"/);
  assert.match(editor, /sourceType/);
});

test("public detail routes consume the permission-filtered related-content RPC", () => {
  for (const route of [
    "src/routes/news.$slug.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/alerts.$alertId.tsx",
    "src/routes/campaigns.$slug.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
  ]) assert.match(read(route), /RelatedContent/);
  assert.match(related, /editorial_public_related_content/);
  assert.match(related, /contentType/);
});
