import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { parseEditorialDraftForTest } from "../src/lib/ai/editorial.functions.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("provider JSON recovery accepts fenced and draft-wrapped Article responses", () => {
  const fenced = parseEditorialDraftForTest("article", "```json\n{\"title\":\"A verified headline\",\"summary\":\"Short summary\"}\n```");
  const wrapped = parseEditorialDraftForTest("article", "Here is the draft:\n{\"draft\":{\"title\":\"Wrapped headline\",\"body\":\"Verified body\"}}\n");
  assert.equal(fenced.title, "A verified headline");
  assert.equal(wrapped.title, "Wrapped headline");
  assert.throws(() => parseEditorialDraftForTest("article", "not JSON"), /provider_json_unparseable/);
});

test("Editorial AI panels are collapsed and expose both Auto-Populate providers", async () => {
  const button = await read("src/components/site/editorial-ai-button.tsx");
  assert.match(button, /useState\(false\)/);
  assert.match(button, /aria-expanded=\{expanded\}/);
  assert.match(button, /provider: selectedProvider/);
  assert.match(button, /Auto-Populate with \$\{providerLabel\}/);
  for (const path of [
    "src/components/site/article-form.tsx",
    "src/components/site/alert-form.tsx",
    "src/components/site/report-form.tsx",
    "src/routes/_authenticated/admin/articles.tsx",
    "src/routes/_authenticated/admin/alerts.tsx",
    "src/routes/_authenticated/admin/reports.tsx",
    "src/routes/_authenticated/admin/campaigns.tsx",
    "src/routes/_authenticated/admin/infrastructure-issues.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /provider="groq"|provider: "groq"|mode === "autopopulate" \? "groq"/);
    assert.match(source, /provider="grok"|provider: "grok"|mode === "autopopulate" \? "groq"/);
  }
});

test("Update Existing is create/edit aware in the client and server", async () => {
  const [server, articleForm, alertForm, reportForm, campaigns, infrastructure] = await Promise.all([
    read("src/lib/ai/editorial.functions.ts"),
    read("src/components/site/article-form.tsx"),
    read("src/components/site/alert-form.tsx"),
    read("src/components/site/report-form.tsx"),
    read("src/routes/_authenticated/admin/campaigns.tsx"),
    read("src/routes/_authenticated/admin/infrastructure-issues.tsx"),
  ]);
  assert.match(server, /mode === "update" && !input\.contentId\?\.trim\(\)/);
  assert.match(server, /resolveEditorialRecord\(context\.supabase, contentType, input\.contentId!/);
  assert.doesNotMatch(articleForm, /mode="update"/);
  assert.doesNotMatch(alertForm, /mode="update"/);
  assert.doesNotMatch(reportForm, /mode="update"/);
  assert.match(campaigns, /editingId \? \[\{ mode: "update"/);
  assert.match(infrastructure, /mode: "update", provider: "grok"/);
});

test("validation diagnostics stay safe and preserve strict schema validation", async () => {
  const [server, provider] = await Promise.all([
    read("src/lib/ai/editorial.functions.ts"),
    read("src/lib/ai/providers.server.ts"),
  ]);
  assert.match(server, /editorial draft validation failed/);
  assert.match(server, /answerLength: result\.answer\.length/);
  assert.match(server, /assertControlledDraftValues/);
  assert.match(provider, /response_format: \{ type: "json_object" \}/);
});
