import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const editorial = await read("src/lib/ai/editorial.functions.ts");
const prompts = await read("src/lib/ai/editorial-prompts.ts");
const button = await read("src/components/site/editorial-ai-button.tsx");
const article = await read("src/components/site/article-form.tsx");
const report = await read("src/components/site/report-form.tsx");
const alert = await read("src/components/site/alert-form.tsx");
const adminArticle = await read("src/routes/_authenticated/admin/articles.tsx");
const adminReport = await read("src/routes/_authenticated/admin/reports.tsx");
const adminAlert = await read("src/routes/_authenticated/admin/alerts.tsx");

test("Task 57 preserves the two original prompt documents as separate contracts", async () => {
  const news = await read("docs/editorial-prompts/share_barabara_news_article_prompt.md");
  const accident = await read("docs/editorial-prompts/share_barabara_accident_report_prompt.md");
  assert.ok(news.length > 5000);
  assert.ok(accident.length > 5000);
  assert.match(news, /senior construction journalist and news editor/);
  assert.match(news, /OUTPUT FORMAT/);
  assert.match(accident, /senior road safety journalist and news editor/);
  assert.match(accident, /If a field cannot be completed.*Not reported/s);
  assert.match(prompts, /share_barabara_news_article_prompt\.md\?raw/);
  assert.match(prompts, /share_barabara_accident_report_prompt\.md\?raw/);
});

test("Task 57 keeps distinct Article, Report and Alert contracts and locked providers", () => {
  assert.match(editorial, /return EDITORIAL_PROMPTS\[contentType\]/);
  assert.match(editorial, /mode === "autopopulate" \? "groq" : "grok"/);
  assert.match(editorial, /image_alt/);
  assert.match(editorial, /seo_description/);
  assert.match(editorial, /Never convert unknown\/null into zero/);
  assert.match(prompts, /export const ALERT_EDITORIAL_PROMPT/);
});

test("Update Existing receives unsaved current form state and remains review-only", () => {
  assert.match(button, /current\?: Record<string, EditorialValue>/);
  assert.match(button, /\.\.\.\(mode === "update" && current \? \{ current \} : \{\}\)/);
  assert.match(button, /Current vs Proposed/);
  assert.match(button, /Apply proposed values to form/);
  assert.match(button, /Save through the normal workflow/);
  assert.doesNotMatch(button, /supabase\.from|\.update\(/);
  for (const source of [article, report, alert, adminArticle, adminReport, adminAlert]) {
    assert.match(source, /mode="update"/);
  }
  assert.match(adminArticle, /mode="update"[\s\S]*current=\{d\}/);
  assert.match(adminReport, /mode="update"[\s\S]*current=\{d\}/);
  assert.match(adminAlert, /mode="update"[\s\S]*current=\{editingParties\}/);
});

test("Task 57 retains safe structured output and official-name rules", () => {
  assert.match(editorial, /JSON\.parse/);
  assert.match(editorial, /Editorial AI returned no usable fields/);
  assert.match(prompts, /KeNHA/);
  assert.match(prompts, /OWNER_NEWS_ARTICLE_PROMPT/);
  assert.match(editorial, /Never publish, save, disclose secrets/);
});

test("Featured Image follows SEO in rich Article and Report editors", () => {
  assert.ok(article.indexOf("SEO (optional") < article.indexOf("Featured image (optional)"));
  assert.ok(adminArticle.indexOf("SEO (optional") < adminArticle.indexOf("Featured image details"));
  assert.ok(adminReport.indexOf("SEO (optional") < adminReport.indexOf("Featured image details"));
});

test("Task 57 has no SearXNG or autonomous publishing dependency", () => {
  assert.doesNotMatch(editorial, /SearXNG|searxng/);
  assert.doesNotMatch(button, /supabase\.from|\.insert\(|\.update\(/);
});
