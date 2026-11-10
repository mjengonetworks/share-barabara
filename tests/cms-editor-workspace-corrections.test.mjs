import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const listing = await readFile("src/routes/_authenticated/admin/reports.tsx", "utf8");
const editor = await readFile("src/components/admin/editorial-record-editor.tsx", "utf8");
const relationships = await readFile("src/components/site/incident-relationship-panel.tsx", "utf8");
const ai = await readFile("src/components/site/editorial-ai-button.tsx", "utf8");
const publicForm = await readFile("src/components/site/report-form.tsx", "utf8");

test("incident relationship management is editor-scoped, not listing-scoped", () => {
  assert.doesNotMatch(listing, /IncidentRelationshipPanel/);
  assert.match(editor, /type === "report" \|\| type === "alert" \? <IncidentRelationshipPanel/);
  assert.match(editor, /sourceId=\{isEditing \? id : undefined\}/);
  assert.match(relationships, /Save this record first/);
  assert.match(relationships, /Confirm link/);
  assert.match(relationships, /Revoke/);
});

test("relationship editor preserves the existing bidirectional RPC and avoids duplicate alert links", () => {
  assert.match(relationships, /confirm_incident_content_link/);
  assert.match(relationships, /filter\(\(row\) => !linkMap\.has\(row\.id\)\)/);
  assert.match(relationships, /reject_incident_relationship_suggestion/);
});

test("editorial AI panels start collapsed and do not request on expansion", () => {
  assert.match(ai, /useState\(false\)/);
  assert.match(ai, /aria-expanded=\{expanded\}/);
  assert.match(ai, /expanded \? <div/);
  assert.doesNotMatch(ai, /onClick=\{[^}]*fetch|onClick=\{[^}]*mutate/);
});

test("report persistence callers preserve structured server failures", () => {
  assert.match(editor, /if \(!result\.ok\)\s*\{[\s\S]{0,220}serializePersistenceDiagnostic\(result\.error/);
  assert.match(publicForm, /if \(!result\.ok\)\s*\{[\s\S]{0,220}serializePersistenceDiagnostic\(result\.error/);
  assert.match(editor, /renderPersistenceError\(error/);
  assert.match(publicForm, /renderPersistenceError\(e/);
});
