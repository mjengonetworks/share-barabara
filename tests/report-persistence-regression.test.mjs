import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const reportFn = await readFile("src/lib/report.functions.ts", "utf8");
const editor = await readFile("src/components/admin/editorial-record-editor.tsx", "utf8");
const articleQueue = await readFile("src/routes/_authenticated/admin/articles.tsx", "utf8");
const geometryEditor = await readFile("src/components/site/road-geometry-editor.tsx", "utf8");

test("accident-report creation uses an explicit persisted payload and returns the database id", () => {
  assert.match(reportFn, /buildAccidentReportPayload/);
  assert.doesNotMatch(reportFn, /const payload = \{\s*\.\.\.submission/);
  assert.match(reportFn, /\.select\("id,title,description/);
  assert.match(reportFn, /return \{ id: report\.id, status: payload\.status, requestId \}/);
});

test("report updates require Supabase to return the updated row", () => {
  assert.match(editor, /\.update\(patch\)\.eq\("id", id\)\.select\("id"\)\.single\(\)/);
  assert.match(editor, /database did not confirm the updated record/);
});

test("article queue keeps routed editor hooks outside the list component", () => {
  assert.match(articleQueue, /function ArticlesQueueListPage\(\)/);
  assert.match(articleQueue, /return <ArticlesQueueListPage \/>/);
});

test("road geometry editor is explicit and does not infer verified alignments", () => {
  assert.match(geometryEditor, /maplibregl\.Map/);
  assert.match(geometryEditor, /Ordered route waypoints/);
  assert.match(geometryEditor, /does not imply a verified alignment/);
});
