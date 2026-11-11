import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("admin Alert add and edit flows expose Generate and Auto-Populate", () => {
  const form = read("src/components/site/alert-form.tsx");
  const edit = read("src/components/admin/editorial-record-editor.tsx");
  assert.ok(form.includes("const { canReview } = useRoles()"));
  assert.ok(form.includes('contentType="alert"'));
  assert.ok(form.includes("mode={mode}"));
  assert.match(form, /provider=\{mode === "autopopulate" \? "groq" : "grok"\}/);
  assert.match(form, /mode="autopopulate"[\s\S]*provider="grok"/);
  assert.match(edit, /mode: "update"/);
});

test("admin Accident Report add and edit flows expose Generate and Auto-Populate", () => {
  const form = read("src/components/site/report-form.tsx");
  const edit = read("src/components/admin/editorial-record-editor.tsx");
  assert.ok(form.includes("const { canReview } = useRoles()"));
  // Editorial AI is mounted by the authenticated admin editor wrapper, not
  // the public contributor form.
  assert.ok(edit.includes('type === "report"'));
  assert.match(edit, /provider: "groq"/);
  assert.ok(edit.includes('type === "report"'));
  assert.match(edit, /mode: "update"/);
});

test("report publishing is role-authoritative and public submissions remain pending", () => {
  const source = read("src/lib/accident-report-persistence.server.ts");
  assert.ok(source.includes('data.requestedStatus === "approved" && canPublish ? "approved" : data.requestedStatus ? "pending"'));
  assert.ok(source.includes(': "pending"'));
  assert.ok(read("src/components/site/report-form.tsx").includes("Publish report"));
  assert.ok(read("src/components/site/report-form.tsx").includes("Submit report for review"));
  assert.equal(read("src/components/site/report-form.tsx").includes("Save draft"), false);
});

test("report draft publishing remains blocked without the approved schema change", () => {
  assert.equal(read("src/lib/accident-report-persistence.server.ts").includes('"draft"'), false);
  assert.equal(read("src/components/site/report-form.tsx").includes('mutate("draft")'), false);
});

// Direct population replaced the old preview/apply step; blank/null model values remain non-destructive.
test("editorial AI application is non-destructive for blank model fields", () => {
  const source = read("src/components/site/editorial-ai-button.tsx");
  assert.ok(source.includes("nonDestructiveDraft"));
  assert.match(source, /value === "" \|\| value === null/);
});

test("existing Infrastructure Issues and Campaigns use the shared Editorial AI contract", () => {
  const source = read("src/lib/ai/editorial.functions.ts");
  assert.ok(source.includes('"article" | "alert" | "report" | "campaign" | "infrastructure"'));
  assert.ok(source.includes('contentType === "infrastructure"'));
  assert.ok(source.includes('contentType === "campaign"'));
  assert.match(read("src/components/admin/editorial-record-editor.tsx"), /type === "campaign"/);
  assert.match(read("src/components/admin/editorial-record-editor.tsx"), /infrastructure/);
});
