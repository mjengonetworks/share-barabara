import assert from "node:assert/strict";
import test from "node:test";
import { editorialDiagnosticForTest, taxonomyLookupPolicyForTest } from "../src/lib/ai/editorial.functions.ts";
import { editorialResponseSchemaForContentType } from "../src/lib/ai/providers.server.ts";
import { readFile } from "node:fs/promises";

test("only an actually missing taxonomy relation is treated as optional", () => {
  assert.equal(
    taxonomyLookupPolicyForTest({ status: 404, code: "PGRST205", message: "table not found" }),
    "unavailable",
  );
  assert.equal(
    taxonomyLookupPolicyForTest({ code: "42501", message: "permission denied" }),
    "failed",
  );
  assert.equal(
    taxonomyLookupPolicyForTest({ status: 503, message: "upstream unavailable" }),
    "failed",
  );
});

test("validation diagnostics identify the safe boundary and field without source or provider data", () => {
  const diagnostic = editorialDiagnosticForTest(
    "article",
    "autopopulate",
    "groq",
    "summary exceeds 20 words",
    "request-123",
  );
  assert.deepEqual(diagnostic, {
    contentType: "article",
    action: "autopopulate",
    provider: "groq",
    boundary: "proposal-validation",
    category: "schema-validation-failed",
    field: "summary",
    requestId: "request-123",
  });
});

test("all CMS content types use the same strict, field-complete provider contract", () => {
  for (const type of ["article", "report", "alert", "campaign", "infrastructure"]) {
    const schema = editorialResponseSchemaForContentType(type).schema;
    assert.equal(schema.additionalProperties, false, type);
    assert.deepEqual(schema.required, Object.keys(schema.properties), type);
  }
});

test("relationship picker uses persisted RPCs and supports reciprocal campaign links", async () => {
  const picker = await readFile("src/components/site/cross-content-editor.tsx", "utf8");
  assert.match(picker, /editorial_link_content/);
  assert.match(picker, /editorial_unlink_content/);
  assert.match(picker, /campaign.*report.*alert/s);
  assert.match(picker, /editorial_content_relationships/);
});

test("Article public placement prioritizes linked Reports below the Summary", async () => {
  const route = await readFile("src/routes/news.$slug.tsx", "utf8");
  assert.ok(route.indexOf("article.summary?.trim()") < route.indexOf("<RelatedContent"));
  assert.match(route, /preferredTypes=\{\["report", "campaign", "alert", "infrastructure"\]\}/);
});

test("Article forms keep incident-only fields out and preserve source mapping", async () => {
  const [add, edit] = await Promise.all([
    readFile("src/components/site/article-form.tsx", "utf8"),
    readFile("src/components/admin/editorial-record-editor.tsx", "utf8"),
  ]);
  assert.match(add, /source: form\.source\.trim\(\) \|\| null/);
  assert.match(edit, /source: form\.source\.trim\(\) \|\| null/);
  assert.doesNotMatch(add, /vehicles_involved|casualty_breakdown|occurred_at/);
  const articleBranch = edit.match(/if \(type === "article"\)[\s\S]*?(?=\n  if \(type === "report"\))/)?.[0] ?? "";
  assert.doesNotMatch(articleBranch, /vehicles_involved|casualty_breakdown|occurred_at/);
});
