import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderPersistenceError, serializePersistenceDiagnostic } from "../src/lib/persistence-diagnostics.ts";

const server = await readFile("src/lib/accident-report-persistence.server.ts", "utf8");
const client = await readFile("src/lib/accident-report-api.ts", "utf8");
const editor = await readFile("src/components/admin/editorial-record-editor.tsx", "utf8");
const form = await readFile("src/components/site/report-form.tsx", "utf8");

test("the replacement endpoint is the single report mutation path", () => {
  assert.match(server, /handleAccidentReportApi/);
  assert.match(server, /request\.method !== "POST"/);
  assert.match(client, /\/api\/admin\/accident-reports/);
  assert.doesNotMatch(editor, /createServerFn|submitAccidentReport/);
  assert.doesNotMatch(form, /createServerFn|submitAccidentReport/);
});

test("the HTTP boundary preserves correlation, operation and content type", () => {
  assert.match(client, /x-request-id/);
  assert.match(server, /x-request-id/);
  assert.match(server, /operation, contentType: "report"/);
  assert.match(server, /"x-request-id": result\.requestId/);
});

test("successful writes require authenticated read-back and durable IDs", () => {
  assert.match(server, /insert\(\{ id: reportId, \.\.\.write \}/);
  assert.match(server, /successful PostgREST insert is the durable acknowledgement/);
  assert.match(server, /readExisting\(supabase, reportId, userId/);
  assert.match(server, /return response\(\{ ok: true, outcome: "confirmed"/);
  assert.match(server, /PERSISTENCE_UNCERTAIN/);
});

test("retries are idempotent and conflicting request UUIDs are not overwritten", () => {
  assert.match(server, /idempotency_check/);
  assert.match(server, /DUPLICATE_REQUEST_CONFLICT/);
  assert.match(server, /readExisting\(supabase, reportId, userId/);
});

test("safe diagnostics survive the UI error renderer", () => {
  const requestId = "9a1c0130-78f3-4565-9ac7-6b425b682e36";
  const rendered = renderPersistenceError(new Error(serializePersistenceDiagnostic({ requestId, phase: "insert_record", code: "23505", status: 409 }, { requestId, operation: "create", contentType: "report" })), { requestId, operation: "create", contentType: "report" });
  assert.match(rendered, /Error code 23505/);
  assert.match(rendered, /phase=insert_record/);
  assert.match(rendered, /status=409/);
  assert.match(rendered, new RegExp(`Request ID ${requestId}`));
});

test("missing fields stay explicitly unavailable", () => {
  const rendered = renderPersistenceError(new Error(serializePersistenceDiagnostic({}, { requestId: "unavailable", operation: "create", contentType: "report" })), { requestId: "unavailable", operation: "create", contentType: "report" });
  assert.match(rendered, /Error code unavailable/);
  assert.match(rendered, /phase=unavailable/);
  assert.match(rendered, /status=unavailable/);
});

test("local empty-form validation is not labelled as a database rejection", () => {
  const rendered = renderPersistenceError(new Error("Report title is required"), { requestId: "dd431909-3889-48cd-9bae-24b45bab3c66", operation: "create", contentType: "report" });
  assert.match(rendered, /^CMS validation failed:/);
  assert.match(rendered, /The report title is required/);
  assert.match(rendered, /Error code TITLE_REQUIRED/);
  assert.match(rendered, /phase=validation/);
  assert.match(rendered, /status=400/);
  assert.doesNotMatch(rendered, /database rejected/);
});

test("field-level validation survives the client diagnostic boundary", () => {
  const requestId = "c4975e55-48cf-42c1-95fa-373bbd16c876";
  const diagnostic = {
    requestId,
    phase: "validation",
    code: "REPORT_FIELDS_INVALID",
    status: 400,
    message: "Review the highlighted report fields.",
    fields: { severity: "Select an incident severity before publishing." },
  };
  const error = new Error(serializePersistenceDiagnostic(diagnostic, { requestId, operation: "create", contentType: "report" }));
  const rendered = renderPersistenceError(error, { requestId, operation: "create", contentType: "report" });
  assert.match(rendered, /REPORT_FIELDS_INVALID/);
  assert.match(error.message, /severity/);
});
