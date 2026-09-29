import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("report creation derives status from the authenticated role, not request data", async () => {
  const text = await source("src/lib/report.functions.ts");
  assert.match(text, /context\.userId/);
  assert.match(text, /roleRank\[entry\.role\]/);
  assert.match(text, /status: canPublish \? "approved" : "pending"/);
  assert.match(text, /user_id: context\.userId/);
  assert.doesNotMatch(text, /data\.status/);
});

test("report forms preserve Unknown separately from zero", async () => {
  const form = await source("src/components/site/report-form.tsx");
  const field = await source("src/components/site/nullable-number-field.tsx");
  assert.match(form, /vehicles_involved: null/);
  assert.match(form, /casualties: null/);
  assert.match(form, /fatalities: null/);
  assert.match(field, /value === null \? "" : value/);
  assert.match(field, /onChange\(null\)/);
  assert.match(field, /parseNullableCount/);
  assert.match(field, /if \(parsed !== null\) onChange\(parsed\)/);
});

test("public report displays and AI evidence use semantic unknown values", async () => {
  const metrics = await source("src/lib/report-metrics.ts");
  const retrieval = await source("src/lib/ai/retrieval.server.ts");
  const report = await source("src/routes/reports.$reportId.tsx");
  assert.match(metrics, /value === null \? "Not confirmed"/);
  assert.match(retrieval, /vehicles_involved \?\? "Not confirmed"/);
  assert.match(report, /displayReportCount\(report\.fatalities\)/);
});

test("known totals with unknown classification retain an Unspecified bucket", async () => {
  const text = await source("src/components/site/party-casualty-inputs.tsx");
  assert.match(text, /totals\.dead === null/);
  assert.match(text, /totals\.injured === null/);
  assert.match(text, /next\.unspecified/);
  assert.match(text, /casualtyBreakdownError/);
});

test("expired campaign review can open without generated report content", async () => {
  const text = await source("src/routes/_authenticated/admin/campaigns.tsx");
  assert.match(text, /report_content: c\.report_content \?\? ""/);
  assert.doesNotMatch(text, /report_content: c\.report_content \?\? c\.description/);
});

test("AI sign-in return destinations are internal and restore the originating surface", async () => {
  const helper = await source("src/lib/ai/return-to-ai.ts");
  const auth = await source("src/routes/auth.index.tsx");
  assert.match(helper, /startsWith\("\/\/"\)/);
  assert.match(helper, /decodeURIComponent/);
  assert.match(helper, /url\.pathname === "\/auth"/);
  assert.match(helper, /url\.origin !== INTERNAL_ORIGIN/);
  assert.match(helper, /header-share-barabara-ai/);
  assert.match(helper, /share-barabara-ai/);
  assert.match(auth, /safeInternalReturnTo/);
});

test("AI surfaces keep signed-out chat inactive and use the shared compact composer", async () => {
  const ai = await source("src/components/site/share-barabara-ai.tsx");
  const alert = await source("src/routes/alerts.$alertId.tsx");
  assert.match(ai, /if \(!user \|\| !message\.trim\(\) \|\| busy\) return/);
  assert.match(ai, /aria-label="Send message"/);
  assert.match(ai, /<ArrowUp/);
  assert.match(ai, /mode === "chat"/);
  assert.match(alert, /mode="chat" contextType="alert"/);
});

test("article summaries remain optional without rendering an empty public block", async () => {
  const form = await source("src/components/site/article-form.tsx");
  const detail = await source("src/routes/news.$slug.tsx");
  assert.doesNotMatch(form, /id="a-summary"[\s\S]{0,120}required/);
  assert.match(detail, /article\.summary\?\.trim\(\)/);
});

test("Editorial AI is server-authorized and separated from contributor forms", async () => {
  const editorial = await source("src/lib/ai/editorial.functions.ts");
  const article = await source("src/components/site/article-form.tsx");
  const alert = await source("src/components/site/alert-form.tsx");
  const report = await source("src/components/site/report-form.tsx");
  assert.match(editorial, /new Set\(\["moderator", "editor", "admin"\]\)/);
  assert.match(editorial, /AUTHORITATIVE CURRENT CONTENT/);
  assert.match(editorial, /NEW UPDATE MATERIAL/);
  assert.match(editorial, /preserveExistingUpdateValues/);
  assert.match(article, /editorialAccess = editorial && canPublishArticles/);
  assert.match(article, /editorialAccess \? \(/);
  assert.match(article, /CategoryMultiSelect/);
  assert.match(article, /mode="generate"/);
  assert.match(article, /mode="autopopulate"/);
  assert.match(alert, /\["generate", "autopopulate"\]/);
  assert.match(report, /\["generate", "autopopulate"\]/);
  assert.doesNotMatch(article, /EditorialAIButton[\s\S]{0,80}canEditSeo/);
});

test("all Article, Alert and Report editors render the three editorial workflows", async () => {
  const articleForm = await source("src/components/site/article-form.tsx");
  const alertForm = await source("src/components/site/alert-form.tsx");
  const reportForm = await source("src/components/site/report-form.tsx");
  const articles = await source("src/routes/_authenticated/admin/articles.tsx");
  const alerts = await source("src/routes/_authenticated/admin/alerts.tsx");
  const reports = await source("src/routes/_authenticated/admin/reports.tsx");

  for (const form of [articleForm, alertForm, reportForm]) {
    assert.match(form, /mode="generate"|\["generate", "autopopulate"\]/);
    assert.match(form, /mode="autopopulate"|\["generate", "autopopulate"\]/);
    assert.doesNotMatch(form, /mode="update"/);
  }
  for (const editor of [articles, alerts, reports]) {
    assert.match(editor, /mode="generate"|\["generate", "autopopulate"\]/);
    assert.match(editor, /mode="autopopulate"|\["generate", "autopopulate"\]/);
    assert.match(editor, /mode="update"/);
  }
});

test("Editorial update panels apply proposals to forms without persisting them", async () => {
  const panel = await source("src/components/site/editorial-ai-button.tsx");
  const articles = await source("src/routes/_authenticated/admin/articles.tsx");
  const alerts = await source("src/routes/_authenticated/admin/alerts.tsx");
  const reports = await source("src/routes/_authenticated/admin/reports.tsx");
  assert.match(panel, /Current vs Proposed/);
  assert.match(panel, /Apply proposed values to form/);
  assert.match(panel, /Save through the normal workflow/);
  assert.match(articles, /mode="update"/);
  assert.match(alerts, /contentType="alert"[\s\S]*mode="update"/);
  assert.match(reports, /contentType="report"[\s\S]*mode="update"/);
  assert.doesNotMatch(panel, /supabase\.from|\.update\(/);
});

test("Editorial report updates preserve unknown counts", async () => {
  const editorial = await source("src/lib/ai/editorial.functions.ts");
  assert.match(editorial, /vehicles_involved.*casualties.*fatalities/);
  assert.match(editorial, /currentValue === null/);
  assert.match(editorial, /preserved\[field\] = null/);
  assert.match(editorial, /null means not confirmed/);
});

test("verification and subscription access remains reachable from the account area", async () => {
  const header = await source("src/components/site/site-header.tsx");
  const settings = await source("src/routes/settings.tsx");
  assert.match(header, /to="\/subscribe"/);
  assert.match(header, /Verification &amp; subscriptions/);
  assert.match(settings, /to="\/subscribe"/);
  assert.match(settings, /Open subscriptions/);
});
