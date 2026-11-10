import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const report = await readFile("src/lib/report.functions.ts", "utf8");
const editor = await readFile("src/components/admin/editorial-record-editor.tsx", "utf8");
const publicForm = await readFile("src/components/site/report-form.tsx", "utf8");

test("Accident Report persistence keeps a sanitized correlation ID through the server function", () => {
  assert.match(report, /requestId\?: string/);
  assert.match(report, /insert_returning_id/);
  assert.match(report, /CMS persistence failed \[\$\{diagnostic\.code\}\]/);
  assert.match(report, /console\.error\("\[CMS persistence failed\]"/);
  assert.doesNotMatch(report, /console\.error\([^\n]*(payload|context\.supabase|access_token)/i);
});

test("admin and public report callers send the correlation ID without adding it to the database payload", () => {
  assert.match(editor, /submitAccidentReport\(\{ data: \{[\s\S]{0,120}requestId,/);
  assert.match(publicForm, /const requestId = crypto\.randomUUID\(\)/);
  assert.match(publicForm, /data: \{[\s\S]{0,120}requestId,/);
  assert.match(report, /fields: PersistedReportFields/);
  assert.doesNotMatch(report, /requestId: requestId/);
});

test("the client surfaces the sanitized error code and server correlation ID", () => {
  assert.match(editor, /const structured = message\.match\(\/\^CMS persistence failed/);
  assert.match(editor, /Error code \$\{structured\[1\]\}/);
  assert.match(editor, /Request ID \$\{structured\[3\]\}/);
});

test("the insert is confirmed before duplicate review and duplicate review cannot turn success into failure", () => {
  const insertOffset = report.indexOf('phase = "insert_returning_id"');
  const returnOffset = report.indexOf("return { id: report.id", insertOffset);
  const duplicateOffset = report.indexOf("suggestIncidentDuplicates", insertOffset);
  assert.ok(insertOffset >= 0 && duplicateOffset > insertOffset && returnOffset > duplicateOffset);
  assert.match(report.slice(duplicateOffset, returnOffset), /catch \{[\s\S]*Duplicate review is additive/);
});
