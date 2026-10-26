import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { completeWithProvider, editorialRetryPolicyForTest } from "../src/lib/ai/providers.server.ts";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("all supported editorial forms expose the approved provider matrix", async () => {
  const files = await Promise.all([
    read("src/components/site/article-form.tsx"),
    read("src/routes/_authenticated/admin/articles.tsx"),
    read("src/components/site/alert-form.tsx"),
    read("src/routes/_authenticated/admin/alerts.tsx"),
    read("src/components/site/report-form.tsx"),
    read("src/routes/_authenticated/admin/reports.tsx"),
    read("src/routes/_authenticated/admin/campaigns.tsx"),
    read("src/routes/_authenticated/admin/infrastructure-issues.tsx"),
  ]);
  const source = files.join("\n");
  assert.ok((source.match(/provider="grok"|provider: "grok"/g) ?? []).length >= 5);
  assert.ok((source.match(/provider="groq"|provider: "groq"/g) ?? []).length >= 5);
  assert.match(source, /mode="update"/);
});

test("editorial source textareas start empty instead of receiving CMS draft labels", async () => {
  const files = await Promise.all([
    read("src/components/site/article-form.tsx"),
    read("src/components/site/alert-form.tsx"),
    read("src/components/site/report-form.tsx"),
    read("src/components/site/editorial-updates-manager.tsx"),
    read("src/routes/_authenticated/admin/articles.tsx"),
    read("src/routes/_authenticated/admin/alerts.tsx"),
    read("src/routes/_authenticated/admin/reports.tsx"),
    read("src/routes/_authenticated/admin/campaigns.tsx"),
    read("src/routes/_authenticated/admin/infrastructure-issues.tsx"),
  ]);
  for (const file of files) assert.doesNotMatch(file, /source=\{`(?:Title|Summary|Body):/);
  assert.match(files.join("\n"), /source=""/);
});

test("Editorial AI panels are collapsed by default and Update is persisted-record only", async () => {
  const [button, editorial, articleForm, campaign, infrastructure] = await Promise.all([
    read("src/components/site/editorial-ai-button.tsx"),
    read("src/lib/ai/editorial.functions.ts"),
    read("src/components/site/article-form.tsx"),
    read("src/routes/_authenticated/admin/campaigns.tsx"),
    read("src/routes/_authenticated/admin/infrastructure-issues.tsx"),
  ]);
  assert.match(button, /useState\(false\)/);
  assert.doesNotMatch(articleForm, /mode="update"/);
  assert.match(campaign, /editingId \? \[\{ mode: "update"/);
  assert.match(infrastructure, /contentId=\{i\.id\}/);
  assert.match(editorial, /mode === "update" && !input\.contentId\?\.trim\(\)/);
  assert.match(editorial, /mode !== "autopopulate" && provider !== "grok"/);
});

test("malformed provider wrappers are parsed without weakening field validation", async () => {
  const editorial = await read("src/lib/ai/editorial.functions.ts");
  assert.match(editorial, /parseStructuredObject/);
  assert.match(editorial, /\["draft", "data", "result"\]/);
  assert.match(editorial, /No fields were changed/);
});

test("provider retries transient failures twice, then returns the successful response", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.XAI_API_KEY;
  const originalUrl = process.env.XAI_API_URL;
  let calls = 0;
  process.env.XAI_API_KEY = "test-key";
  process.env.XAI_API_URL = "https://provider.test/v1/chat/completions";
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response("busy", { status: 503 });
    return Response.json({ choices: [{ message: { content: '{"title":"Verified"}' } }] });
  };
  try {
    const result = await completeWithProvider("grok", {
      mode: "editorial",
      task: "draft",
      message: "source",
      evidence: [],
    });
    assert.equal(result.ok, true);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = originalKey;
    if (originalUrl === undefined) delete process.env.XAI_API_URL;
    else process.env.XAI_API_URL = originalUrl;
  }
});

test("authorization failures are not retried and retry policy remains bounded", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.XAI_API_KEY;
  const originalUrl = process.env.XAI_API_URL;
  let calls = 0;
  process.env.XAI_API_KEY = "test-key";
  process.env.XAI_API_URL = "https://provider.test/v1/chat/completions";
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("denied", { status: 401 });
  };
  try {
    const result = await completeWithProvider("grok", {
      mode: "editorial",
      task: "draft",
      message: "source",
      evidence: [],
    });
    assert.equal(result.ok, false);
    assert.equal(calls, 1);
    assert.equal(editorialRetryPolicyForTest.maxRetries, 2);
    assert.equal(editorialRetryPolicyForTest.retryableStatuses.includes(401), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = originalKey;
    if (originalUrl === undefined) delete process.env.XAI_API_URL;
    else process.env.XAI_API_URL = originalUrl;
  }
});
