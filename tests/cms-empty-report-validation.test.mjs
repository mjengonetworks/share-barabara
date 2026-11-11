import assert from "node:assert/strict";
import test from "node:test";
import { handleAccidentReportApi } from "../src/lib/accident-report-persistence.server.ts";

test("an empty report payload is rejected before authentication or database mutation", async () => {
  const response = await handleAccidentReportApi(new Request("https://example.test/api/admin/accident-reports", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "dd431909-3889-48cd-9bae-24b45bab3c66" },
    body: JSON.stringify({}),
  }));
  const result = await response.json();
  assert.equal(response.status, 400);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "TITLE_REQUIRED");
  assert.equal(result.error.phase, "validation");
  assert.equal(result.error.status, 400);
  assert.equal(result.requestId, "dd431909-3889-48cd-9bae-24b45bab3c66");
});
