import assert from "node:assert/strict";
import test from "node:test";
import { taxonomyLookupPolicyForTest } from "../src/lib/ai/editorial.functions.ts";
import { editorialResponseSchemaForContentType } from "../src/lib/ai/providers.server.ts";

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

test("all CMS content types use the same strict, field-complete provider contract", () => {
  for (const type of ["article", "report", "alert", "campaign", "infrastructure"]) {
    const schema = editorialResponseSchemaForContentType(type).schema;
    assert.equal(schema.additionalProperties, false, type);
    assert.deepEqual(schema.required, Object.keys(schema.properties), type);
  }
});
