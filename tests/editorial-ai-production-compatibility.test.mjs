import assert from "node:assert/strict";
import test from "node:test";
import { assertControlledDraftValues } from "../src/lib/ai/editorial.functions.ts";

test("missing optional taxonomy keeps classifications unknown instead of aborting AI", () => {
  const draft = { title: "Road hazard", hazard_type: "invented", severity: "invented" };
  const result = assertControlledDraftValues("alert", draft, {
    unavailable: ["hazard_types", "alert_severities"],
  });
  assert.equal(result.hazard_type, null);
  assert.equal(result.severity, null);
});

test("available taxonomy still rejects unsupported classifications with the field name", () => {
  assert.throws(
    () => assertControlledDraftValues("alert", { hazard_type: "invented" }, { hazardTypes: ["crash"] }),
    /unsupported hazard_type/,
  );
});

test("the coordinated CMS action matrix keeps one content type and provider contract", async () => {
  const files = await Promise.all([
    "src/components/admin/editorial-record-editor.tsx",
    "src/components/site/article-form.tsx",
    "src/components/site/alert-form.tsx",
    "src/components/site/report-form.tsx",
    "src/components/admin/editorial-record-editor.tsx",
  ].map((file) => import("node:fs/promises").then(({ readFile }) => readFile(file, "utf8"))));
  const source = files.join("\n");
  for (const contentType of ["article", "alert", "report", "campaign", "infrastructure"]) {
    assert.ok(new RegExp(`contentType=\\"${contentType}\\"|contentType: \\"${contentType}\\"|type === \\"${contentType}\\"|type=\\"${contentType}\\"`).test(source), contentType);
  }
  assert.ok(source.includes('mode="generate"') || source.includes('mode: "generate"'));
  assert.ok(source.includes('mode="autopopulate"') || source.includes('mode: "autopopulate"'));
  assert.ok(source.includes('mode="update"') || source.includes('mode: "update"'));
  assert.ok(source.includes('provider="groq"') || source.includes('provider: "groq"'));
  assert.ok(source.includes('provider="grok"') || source.includes('provider: "grok"'));
});
