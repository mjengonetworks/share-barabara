import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Report Add and Edit use one structured editor and the listing routes new through the outlet", async () => {
  const listing = await read("src/routes/_authenticated/admin/reports.tsx");
  const add = await read("src/routes/_authenticated/admin/reports.new.tsx");
  const edit = await read("src/routes/_authenticated/admin/reports.$reportId.edit.tsx");
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.ok(listing.includes("(?:new|[^/]+\\/edit)"));
  assert.match(listing, /return <Outlet \/>/);
  assert.match(add, /EditorialRecordEditor type="report"/);
  assert.match(edit, /EditorialRecordEditor type="report"/);
  assert.match(editor, /id\?: string/);
  assert.match(editor, /enabled: isEditing/);
  assert.match(editor, /submitAccidentReport/);
});

test("Report create mode exposes exactly three primary actions and edit adds same-record update", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(editor, /const aiActions = \[/);
  assert.match(editor, /mode: "generate" as const, provider: "grok"/);
  assert.match(editor, /mode: "autopopulate" as const, provider: "groq"/);
  assert.match(editor, /mode: "autopopulate" as const, provider: "grok"/);
  assert.match(editor, /isEditing \? \[\{ mode: "update" as const, provider: "grok" as const \}\] : \[\]/);
  assert.match(editor, /contentId=\{id\}/);
});

test("the Article editor remains separate from structured accident fields", async () => {
  const article = await read("src/components/site/article-form.tsx");
  for (const field of ["fatalities", "casualty_breakdown", "vehicles_involved", "incident_type"]) {
    assert.doesNotMatch(article, new RegExp(`\\b${field}\\b`), field);
  }
});

test("statistics do not mix ordinary News rows into incident metrics", async () => {
  const stats = await read("src/routes/statistics.tsx");
  assert.doesNotMatch(stats, /from\("news"\)/);
  assert.match(stats, /accident_reports/);
  assert.match(stats, /status.*approved/);
  assert.match(stats, /canonical Report[\s\S]*relationship exists/);
  assert.match(stats, /report metric[\s\S]*authoritative/);
});

test("statistics source limitations and safe migration proposal are documented", async () => {
  const pending = await read("PENDING.md");
  assert.match(pending, /ACCIDENT REPORT CMS REBUILD/);
  assert.match(pending, /incident_content_links/);
  assert.match(pending, /not created or executed/);
});
