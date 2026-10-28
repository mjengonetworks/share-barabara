import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public alerts use an optional editorial summary without changing the database contract", async () => {
  const route = await read("src/routes/alerts.$alertId.tsx");
  assert.match(route, /type AlertEditorialFields/);
  assert.match(route, /summary\?: string \| null/);
  assert.match(route, /editorialSummary/);
  assert.match(route, /editorialSummary \? <AlertSummary>/);
  assert.doesNotMatch(route, /supabase\/migrations/);
});

test("alert summary is distinct from the disclosure and AI is immediately below it", async () => {
  const route = await read("src/routes/alerts.$alertId.tsx");
  const summary = await read("src/components/site/alert-detail-content.tsx");
  const summaryIndex = route.indexOf("<AlertSummary>");
  const aiIndex = route.indexOf("<ShareBarabaraAI");
  const disclosureIndex = route.indexOf("<AlertDescriptionDisclosure>");
  assert.ok(summaryIndex >= 0 && aiIndex > summaryIndex && disclosureIndex > aiIndex);
  assert.match(summary, /aria-label="Alert summary"/);
  assert.doesNotMatch(summary, /repeating-linear-gradient|border-l/);
  assert.doesNotMatch(route, /EditorialSummary/);
});

test("alert full description keeps blue treatment and native keyboard disclosure", async () => {
  const component = await read("src/components/site/alert-detail-content.tsx");
  assert.match(component, /<details open/);
  assert.match(component, /<summary/);
  assert.match(component, /Full alert description/);
  assert.match(component, /bg-blue-50/);
  assert.match(component, /group-open:rotate-180/);
});

test("article and report summaries continue to use the shared editorial standfirst", async () => {
  const [article, report] = await Promise.all([
    read("src/routes/news.$slug.tsx"),
    read("src/routes/reports.$reportId.tsx"),
  ]);
  assert.match(article, /EditorialSummary/);
  assert.match(report, /EditorialSummary/);
});
