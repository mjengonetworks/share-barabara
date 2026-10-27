import assert from "node:assert/strict";
import test from "node:test";
import { resolveSourceMaterialForTest } from "../src/lib/ai/editorial.functions.ts";

const originalFetch = globalThis.fetch;

test("editorial retrieval preserves inline evidence when one URL fails", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("bad.example")) return new Response("blocked", { status: 403 });
    return new Response("<html><body>Verified source detail</body></html>", { status: 200, headers: { "content-type": "text/html" } });
  };
  try {
    const result = await resolveSourceMaterialForTest("Inline verified fact. https://bad.example/story https://good.example/story");
    assert.match(result, /Inline verified fact/);
    assert.match(result, /Verified source detail/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("editorial retrieval accepts JSON source responses and fails closed for URL-only failure", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ headline: "Verified JSON source" }), { status: 200, headers: { "content-type": "application/json" } });
  await assert.doesNotReject(async () => {
    const result = await resolveSourceMaterialForTest("https://api.example/source");
    assert.match(result, /Verified JSON source/);
  });

  globalThis.fetch = async () => new Response("blocked", { status: 503 });
  await assert.rejects(() => resolveSourceMaterialForTest("https://unavailable.example/source"), /Could not retrieve any source URL/);
  globalThis.fetch = originalFetch;
});
