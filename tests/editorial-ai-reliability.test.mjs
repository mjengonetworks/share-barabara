import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { completeWithProvider, editorialResponseSchemaForContentType } from "../src/lib/ai/providers.server.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("provider content blocks are joined without exposing raw provider payloads", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const originalUrl = process.env.GROQ_API_URL;
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_API_URL = "https://provider.test/v1/chat/completions";
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: [{ type: "text", text: "{\"title\":" }, { type: "text", text: "\"Verified\"}" }] } }] });
  try {
    const result = await completeWithProvider("groq", { mode: "editorial", task: "extract", message: "source", evidence: [] });
    assert.equal(result.ok, true);
    assert.equal(result.answer, '{"title":"Verified"}');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
    if (originalUrl === undefined) delete process.env.GROQ_API_URL; else process.env.GROQ_API_URL = originalUrl;
  }
});

test("provider timeouts retry within the bounded policy and fail safely", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.XAI_API_KEY;
  const originalUrl = process.env.XAI_API_URL;
  let calls = 0;
  process.env.XAI_API_KEY = "test-key";
  process.env.XAI_API_URL = "https://provider.test/v1/chat/completions";
  globalThis.fetch = async () => {
    calls += 1;
    const error = new Error("timed out");
    error.name = "AbortError";
    throw error;
  };
  try {
    const result = await completeWithProvider("grok", { mode: "editorial", task: "draft", message: "source", evidence: [] });
    assert.equal(result.ok, false);
    assert.equal(result.error, "provider_timeout");
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.XAI_API_KEY; else process.env.XAI_API_KEY = originalKey;
    if (originalUrl === undefined) delete process.env.XAI_API_URL; else process.env.XAI_API_URL = originalUrl;
  }
});

test("content schemas reject unsupported optional database fields", () => {
  for (const type of ["article", "report", "alert", "campaign", "infrastructure"]) {
    const schema = editorialResponseSchemaForContentType(type).schema;
    assert.equal(schema.additionalProperties, false);
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0);
  }
});

test("the editor guards duplicate requests and preserves changed form values", async () => {
  const button = await read("src/components/site/editorial-ai-button.tsx");
  assert.match(button, /if \(\(!sourceMaterial\.trim\(\) && sourceFiles\.length === 0\) \|\| busy\) return/);
  assert.match(button, /requestRef\.current/);
  assert.match(button, /const snapshot = currentRef\.current/);
  assert.match(button, /JSON\.stringify\(latest\[field\]\) === JSON\.stringify\(snapshot\[field\]\)/);
  assert.match(button, /No fields were changed|toast\.error/);
});
