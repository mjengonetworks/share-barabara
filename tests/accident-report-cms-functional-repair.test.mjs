import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { filterEditorialDraftForApply } from "../src/lib/ai/editorial-ui-policy.ts";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("unified report and infrastructure editors map AI schema fields to their form state", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(editor, /type === "report"\) return \{ \.\.\.value, description: value\.body \}/);
  assert.match(editor, /type === "infrastructure"\) return \{ \.\.\.value, content: value\.body \}/);
  assert.match(editor, /type === "report" && key === "description"/);
  assert.match(editor, /type === "infrastructure" && key === "content"/);
});

test("all four report AI actions are present and update requires a persisted record", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(editor, /\{ mode: "generate" as const, provider: "grok" as const \}/);
  assert.match(editor, /\{ mode: "autopopulate" as const, provider: "groq" as const \}/);
  assert.match(editor, /\{ mode: "autopopulate" as const, provider: "grok" as const \}/);
  assert.match(editor, /\{ mode: "update" as const, provider: "grok" as const \}/);
  assert.match(editor, /contentId=\{id\}/);
});

test("generate and auto-populate never replace existing editor values silently", () => {
  const latest = {
    title: "Verified title",
    description: "Verified report",
    fatalities: null,
    parties_involved: [],
  };
  const snapshot = { ...latest };
  const proposed = {
    title: "AI replacement",
    description: "AI replacement",
    fatalities: 4,
    parties_involved: ["driver"],
  };
  assert.deepEqual(filterEditorialDraftForApply(proposed, latest, snapshot, "generate"), {
    parties_involved: ["driver"],
  });
  assert.deepEqual(filterEditorialDraftForApply(proposed, latest, snapshot, "autopopulate"), {
    parties_involved: ["driver"],
  });
  assert.deepEqual(filterEditorialDraftForApply(proposed, latest, snapshot, "update"), proposed);
});

test("report editor relationship controls are deferred until a durable ID and listing stays focused", async () => {
  const [editor, listing, relationship] = await Promise.all([
    read("src/components/admin/editorial-record-editor.tsx"),
    read("src/routes/_authenticated/admin/reports.tsx"),
    read("src/components/site/incident-relationship-panel.tsx"),
  ]);
  assert.match(editor, /sourceId=\{isEditing \? id : undefined\}/);
  assert.doesNotMatch(listing, /IncidentRelationshipPanel|IncidentDiscoveryPanel/);
  assert.match(relationship, /Save this record first/);
  assert.match(relationship, /details className/);
});

test("report listing keeps title and actions in aligned, horizontally scrollable columns", async () => {
  const listing = await read("src/routes/_authenticated/admin/reports.tsx");
  assert.match(listing, /const REPORT_LISTING_GRID/);
  assert.match(listing, /grid min-w-\[920px\] \$\{REPORT_LISTING_GRID\}/);
  assert.match(listing, /break-words whitespace-normal font-semibold/);
  assert.match(listing, /data-row-action/);
  assert.match(listing, /Unpublish this report/);
});

test("AI update record retrieval includes fields required to preserve report content", async () => {
  const editorial = await read("src/lib/ai/editorial.functions.ts");
  assert.match(editorial, /id,title,summary,description,county,road,incident_type,severity/);
});
