import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const providers = read("src/lib/ai/providers.server.ts");
const editorial = read("src/lib/ai/editorial.functions.ts");
const reportForm = read("src/components/site/report-form.tsx");
const adminReports = read("src/routes/_authenticated/admin/reports.tsx");

test("Editorial AI sends a provider-compatible strict schema instead of generic JSON mode", () => {
  assert.match(providers, /type: "json_schema"/);
  assert.match(providers, /strict: true/);
  assert.match(providers, /additionalProperties: false/);
  assert.match(providers, /required: fields/);
  assert.match(editorial, /responseSchema: editorialResponseSchemaForContentType\(contentType\)/);
});

test("Report AI maps the complete supported draft without inventing database fields", () => {
  for (const field of ["incident_type", "occurred_at", "vehicles_involved", "casualties", "fatalities", "parties_involved"]) {
    assert.match(reportForm, new RegExp(`draft\\.${field}`));
  }
  assert.match(adminReports, /const applyAI = \(draft: Record<string, unknown>\)/);
  for (const field of ["vehicles_involved", "casualties", "fatalities", "parties_involved", "seo_title", "image_alt"]) {
    assert.match(adminReports, new RegExp(`${field}:`));
  }
  assert.doesNotMatch(adminReports, /incident_type.*draft|draft.*incident_type/s);
  assert.match(editorial, /Never convert absence of evidence into a confirmed fact/);
  assert.match(editorial, /currentValue === null/);
});

test("all five CMS types expose distinct Add and Edit action contracts", () => {
  const files = {
    article: ["src/components/site/article-form.tsx", "src/routes/_authenticated/admin/articles.tsx"],
    alert: ["src/components/site/alert-form.tsx", "src/routes/_authenticated/admin/alerts.tsx"],
    report: ["src/components/site/report-form.tsx", "src/routes/_authenticated/admin/reports.tsx"],
    campaign: ["src/routes/_authenticated/admin/campaigns.tsx"],
    infrastructure: ["src/components/site/infrastructure-issue-form.tsx", "src/routes/_authenticated/admin/infrastructure-issues.tsx"],
  };
  for (const [contentType, paths] of Object.entries(files)) {
    const source = paths.map(read).join("\n");
    assert.match(source, new RegExp(`contentType=\\"${contentType}\\"`));
    assert.ok(/mode: "generate", provider: "grok"|mode="generate"[\s\S]*provider="grok"|mode=\{mode\}[\s\S]*provider=\{mode === "autopopulate" \? "groq" : "grok"\}/.test(source), `${contentType}: missing Generate/Grok`);
    assert.ok(/mode: "autopopulate", provider: "groq"|mode="autopopulate"[\s\S]*provider="groq"|mode=\{mode\}[\s\S]*provider=\{mode === "autopopulate" \? "groq" : "grok"\}/.test(source), `${contentType}: missing Auto-Populate/Groq`);
    assert.ok(/mode: "autopopulate", provider: "grok"|mode="autopopulate"[\s\S]*provider="grok"/.test(source), `${contentType}: missing Auto-Populate/Grok`);
    assert.ok(/mode: "update"(?: as const)?, provider: "grok"|mode="update"/.test(source), `${contentType}: missing Update Existing/Grok`);
  }
});
