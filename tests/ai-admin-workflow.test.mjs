import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("admin Alert add and edit flows expose Generate and Auto-Populate", () => {
  const form = read("src/components/site/alert-form.tsx");
  const edit = read("src/routes/_authenticated/admin/alerts.tsx");
  assert.ok(form.includes("const { canReview } = useRoles()"));
  assert.ok(form.includes('contentType="alert"'));
  assert.ok(form.includes('mode={mode}'));
  assert.ok(form.includes('["generate", "autopopulate"]'));
  assert.ok(edit.includes('mode="update"'));
});

test("admin Accident Report add and edit flows expose Generate and Auto-Populate", () => {
  const form = read("src/components/site/report-form.tsx");
  const edit = read("src/routes/_authenticated/admin/reports.tsx");
  assert.ok(form.includes("const { canReview } = useRoles()"));
  assert.ok(form.includes('contentType="report"'));
  assert.ok(form.includes('["generate", "autopopulate"]'));
  assert.ok(edit.includes('contentType="report"'));
  assert.ok(edit.includes('mode="update"'));
});

test("report publishing is role-authoritative and public submissions remain pending", () => {
  const source = read("src/lib/report.functions.ts");
  assert.ok(source.includes('status: canPublish && requestedStatus === "approved"'));
  assert.ok(source.includes(': "pending"'));
  assert.ok(read("src/components/site/report-form.tsx").includes("Publish report"));
  assert.ok(read("src/components/site/report-form.tsx").includes("Submit report for review"));
  assert.equal(read("src/components/site/report-form.tsx").includes("Save draft"), false);
});

test("report draft publishing remains blocked without the approved schema change", () => {
  assert.equal(read("src/lib/report.functions.ts").includes('"draft"'), false);
  assert.equal(read("src/components/site/report-form.tsx").includes('mutate("draft")'), false);
});

test("editorial AI application is non-destructive for blank model fields", () => {
  const source = read("src/components/site/editorial-ai-button.tsx");
  assert.ok(source.includes("nonDestructiveDraft"));
  assert.ok(source.includes("value !== \"\" && value !== null"));
});

test("Infrastructure Issues and Campaigns are not presented as supported Editorial AI types", () => {
  const source = read("src/lib/ai/editorial.functions.ts");
  assert.ok(source.includes('"article" | "alert" | "report"'));
  assert.equal(source.includes('"infrastructure"'), false);
  assert.equal(source.includes('"campaign"'), false);
});
