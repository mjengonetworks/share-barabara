import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin navigation groups operational surfaces without exposing them publicly", async () => {
  const admin = await read("src/routes/_authenticated/admin/route.tsx");
  assert.match(admin, /label: "Content & moderation"/);
  assert.match(admin, /label: "Road safety operations"/);
  assert.match(admin, /to: "\/admin\/incident-sources"/);
  assert.match(admin, /to: "\/admin\/crash-statistics"/);
  assert.match(admin, /to: "\/admin\/categories"/);
  assert.match(admin, /minRank: ROLE_RANK\.editor/);
});

test("admin dashboard surfaces data-backed operational queues safely", async () => {
  const dashboard = await read("src/routes/_authenticated/admin/index.tsx");
  assert.match(dashboard, /admin-operational-queue/);
  assert.match(dashboard, /incident_monitor_sources/);
  assert.match(dashboard, /incident_duplicate_suggestions/);
  assert.match(dashboard, /Reported comments/);
  assert.match(dashboard, /operationalQueue\[item\.key\].*\? "—"/s);
});

test("incident sources support bounded cadence, operational state and editing", async () => {
  const sources = await read("src/routes/_authenticated/admin/incident-sources.tsx");
  assert.match(sources, /editingId/);
  assert.match(sources, /check_interval_minutes/);
  assert.match(sources, /interval < 5/);
  assert.match(sources, /Check every \(minutes\)/);
  assert.match(sources, />Edit</);
  assert.match(sources, /operationalState/);
  assert.match(sources, /"Failed"/);
  assert.match(sources, /"Due"/);
  assert.match(sources, /never publishes an incident/);
});

test("admin content lists preserve unknown casualty values and unavailable views", async () => {
  const reports = await read("src/routes/_authenticated/admin/reports.tsx");
  const articles = await read("src/routes/_authenticated/admin/articles.tsx");
  const alerts = await read("src/routes/_authenticated/admin/alerts.tsx");
  assert.match(reports, /NullableNumberField[\s\S]*label="Injured"/);
  assert.match(reports, /NullableNumberField[\s\S]*label="Fatalities"/);
  assert.match(reports, /viewCountsError \? "—"/);
  assert.match(articles, /viewCountsError \|\| viewCountsLoading \? "—"/);
  assert.match(alerts, /viewCountsError \? "—"/);
});

test("Article views use exact canonical counts and sort the complete filtered dataset", async () => {
  const hook = await read("src/hooks/useViewCounts.ts");
  const articles = await read("src/routes/_authenticated/admin/articles.tsx");
  assert.match(hook, /count: "exact", head: true/);
  assert.match(hook, /news_views|accident_report_views|alert_views/);
  assert.match(articles, /viewSort/);
  assert.match(articles, /sortedArticles\.map/);
  assert.match(articles, /viewCountsLoading/);
  assert.match(articles, /Sort articles by views/);
});
