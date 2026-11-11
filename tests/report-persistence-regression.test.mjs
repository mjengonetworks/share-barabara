import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const reportFn = await readFile("src/lib/accident-report-persistence.server.ts", "utf8");
const editor = await readFile("src/components/admin/editorial-record-editor.tsx", "utf8");
const articleQueue = await readFile("src/routes/_authenticated/admin/articles.tsx", "utf8");
const geometryEditor = await readFile("src/components/site/road-geometry-editor.tsx", "utf8");
const newsIndex = await readFile("src/routes/news.index.tsx", "utf8");

test("accident-report creation uses an explicit persisted payload and returns the database id", () => {
  assert.match(reportFn, /function payload\(/);
  assert.doesNotMatch(reportFn, /\.\.\.data/);
  assert.match(reportFn, /insert\(\{ id: reportId, \.\.\.write \}/);
  assert.match(reportFn, /successful PostgREST insert is the durable acknowledgement/);
  assert.match(reportFn, /readExisting\(supabase, reportId, userId/);
  assert.match(reportFn, /outcome: "confirmed"/);
  assert.match(reportFn, /idempotency_check/);
});

test("persistence verification uses the authenticated client without a service-role dependency", () => {
  const start = reportFn.indexOf("async function readExisting");
  const end = reportFn.indexOf("async function mutate", start);
  const verification = reportFn.slice(start, end);
  assert.match(verification, /supabase: SupabaseClient<Database>/);
  assert.match(verification, /supabase\.from\("accident_reports"\)/);
  assert.doesNotMatch(verification, /supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(verification, /PERSISTENCE_UNCERTAIN/);
});

test("create and update expose confirmed versus uncertain outcomes", () => {
  assert.match(reportFn, /outcome: "confirmed"/);
  assert.match(reportFn, /PERSISTENCE_UNCERTAIN/);
  assert.match(reportFn, /phase: "readback_verification"/);
  assert.match(reportFn, /idempotency_check/);
});

test("report updates verify the committed row without relying on RLS RETURNING", () => {
  assert.match(reportFn, /\.update\(update\)\.eq\("id", reportId\)\.eq\("user_id", userId\)/);
  assert.match(reportFn, /delete update\.user_id/);
  assert.match(reportFn, /readExisting\(supabase, reportId, userId/);
  assert.match(editor, /saveAccidentReport\(\{ requestId/);
  assert.match(editor, /\.\.\.\(isEditing \? \{ id \} : \{\}\)/);
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

test("news published query destructures the road filter before using it", () => {
  assert.match(
    newsIndex,
    /function usePublishedQuery\(\{[\s\S]*?name,\s*category,\s*road,\s*limit = 12,/
  );
});
