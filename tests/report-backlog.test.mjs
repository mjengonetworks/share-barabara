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
