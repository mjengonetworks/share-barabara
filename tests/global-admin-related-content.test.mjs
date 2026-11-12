import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

test("admin listings use constrained responsive layouts instead of fixed overflow widths", async () => {
  const files = [
    "src/components/admin/admin-listing-surface.tsx",
    "src/routes/_authenticated/admin/articles.tsx",
    "src/routes/_authenticated/admin/alerts.tsx",
    "src/routes/_authenticated/admin/campaigns.tsx",
    "src/routes/_authenticated/admin/infrastructure-issues.tsx",
    "src/routes/_authenticated/admin/my-content.tsx",
  ];
  for (const file of files.slice(1)) {
    const source = await read(file);
    assert.match(source, /min-w-\[(?:900|920|980)px\]/, `${file} keeps a readable mobile table width`);
  }
  assert.match(await read("src/components/admin/admin-listing-surface.tsx"), /overflow-visible/);
  assert.match(await read("src/components/admin/admin-listing-surface.tsx"), /overflow-x-auto/);
  assert.match(await read("src/routes/_authenticated/admin/alerts.tsx"), /table-fixed/);
});

test("related content is a compact searchable multi-select and preserves canonical incident relationships", async () => {
  const source = await read("src/components/site/cross-content-editor.tsx");
  assert.match(source, /data-related-content/);
  assert.match(source, /> Related Content/);
  assert.match(source, /Search existing records/);
  assert.match(source, /Link selected/);
  assert.match(source, /editorial_link_content/);
  assert.match(source, /feed_post/);
  assert.match(source, /isCanonicalIncidentPair/);
  assert.match(source, /window\.confirm\("Remove this relationship\?"\)/);
  assert.match(source, /data-generate-related-content/);
  assert.match(source, /Generate with Grok/);
  assert.match(source, /editorial_create_related_draft_record/);
  assert.match(source, /remains unpublished/);
});

test("specialized Alert-to-Report relationship safeguards remain editor-scoped", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  const panel = await read("src/components/site/incident-relationship-panel.tsx");
  assert.match(editor, /IncidentRelationshipPanel/);
  assert.match(panel, /canonical|confirmed|report/i);
  const listing = await read("src/routes/_authenticated/admin/reports.tsx");
  assert.doesNotMatch(listing, /IncidentRelationshipPanel/);
});

