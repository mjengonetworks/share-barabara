import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderPersistenceError, serializePersistenceDiagnostic } from "../src/lib/persistence-diagnostics.ts";

const diagnostic = await readFile("src/lib/persistence-diagnostics.ts", "utf8");
const editor = await readFile("src/components/admin/editorial-record-editor.tsx", "utf8");
const form = await readFile("src/components/site/report-form.tsx", "utf8");
const report = await readFile("src/lib/report.functions.ts", "utf8");

test("diagnostic boundary preserves every safe field through the UI error contract", () => {
  assert.match(diagnostic, /serializePersistenceDiagnostic/);
  assert.match(diagnostic, /requestId: diagnostic\.requestId/);
  assert.match(diagnostic, /phase: diagnostic\.phase/);
  assert.match(diagnostic, /code: diagnostic\.code/);
  assert.match(diagnostic, /status: diagnostic\.status/);
  assert.match(diagnostic, /operation: context\.operation/);
  assert.match(diagnostic, /contentType: context\.contentType/);
  assert.match(diagnostic, /phase=\$\{phase\}; status=\$\{status\}/);
});

test("generic-toast regression retains structured diagnostics after a thrown server result", () => {
  const requestId = "9a1c0130-78f3-4565-9ac7-6b425b682e36";
  const thrown = new Error(serializePersistenceDiagnostic({
    requestId,
    phase: "insert_returning_id",
    code: "23505",
    status: 409,
    message: "A conflicting report already exists.",
  }, { requestId, operation: "create", contentType: "report" }));
  const rendered = renderPersistenceError(thrown, { requestId, operation: "create", contentType: "report" });
  assert.match(rendered, /Error code 23505/);
  assert.match(rendered, /phase=insert_returning_id/);
  assert.match(rendered, /status=409/);
  assert.match(rendered, new RegExp(`Request ID ${requestId}`));
  assert.match(rendered, /operation=create; contentType=report/);
});

test("admin and public report callers use the shared diagnostic renderer", () => {
  assert.match(editor, /serializePersistenceDiagnostic\(result\.error/);
  assert.match(editor, /renderPersistenceError\(error/);
  assert.match(form, /serializePersistenceDiagnostic\(result\.error/);
  assert.match(form, /renderPersistenceError\(e/);
});

test("successful report results still require a durable database ID", () => {
  assert.match(report, /select\("id,title,description/);
  assert.match(report, /report\.id/);
  assert.match(report, /return \{ ok: true as const, id: report\.id/);
});
