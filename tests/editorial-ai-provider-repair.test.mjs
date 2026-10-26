import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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
