import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(file, "utf8");

test("report submission shares a compact three-column row with selected featured reports", async () => {
  const [reports, form] = await Promise.all([
    source("src/routes/reports.index.tsx"),
    source("src/components/site/report-form.tsx"),
  ]);
  assert.doesNotMatch(reports, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,30%\)\]/);
  assert.match(reports, /reportSubmissionCard/);
  assert.match(reports, /featured\.length >= 2[\s\S]*lg:grid-cols-3[\s\S]*reportSubmissionCard/);
  assert.match(reports, /title="Featured Accident Reports"/);
  assert.match(form, /Additional details \(optional\)/);
});

test("hazard submission shares a compact three-column row with selected featured alerts", async () => {
  const alerts = await source("src/routes/alerts.index.tsx");
  assert.doesNotMatch(alerts, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,30%\)\]/);
  assert.match(alerts, /hazardSubmissionCard/);
  assert.match(alerts, /featured\.length >= 2[\s\S]*lg:grid-cols-3[\s\S]*hazardSubmissionCard/);
  assert.match(alerts, /title="Featured Alerts"/);
  assert.match(alerts, /id="alert-form"/);
});

test("category grouping and incident grouping remain separate from urgent collections", async () => {
  const [news, alerts, reports] = await Promise.all([
    source("src/routes/news.index.tsx"),
    source("src/routes/alerts.index.tsx"),
    source("src/routes/reports.index.tsx"),
  ]);
  assert.match(news, /groupLatestByEntity/);
  assert.match(alerts, /IncidentEntityGroups/);
  assert.match(reports, /IncidentEntityGroups/);
  assert.match(alerts, /title="Latest Alerts"/);
  assert.match(reports, /title="Latest Accident Reports"/);
});

test("incident images fail closed to compact intentional fallbacks", async () => {
  const layout = await source("src/components/site/public-layout.tsx");
  assert.match(layout, /onError=\{\(\) => setFailedUrl\(imageUrl\)\}/);
  assert.match(layout, /No image supplied/);
  assert.match(layout, /object-contain/);
});

test("ecosystem discovery uses coordinated three-card sections and verified destinations", async () => {
  const ecosystem = await source("src/components/site/mjengo-previews.tsx");
  assert.match(ecosystem, /Mjengo Hub Home &amp; Media/);
  assert.match(ecosystem, /Mjengo Hub Articles/);
  assert.match(ecosystem, /Project Tracker/);
  assert.match(ecosystem, /Mjengo Networks/);
  assert.match(ecosystem, /Jobs, Tenders, Events &amp; Joining/);
  assert.match(ecosystem, /Suppliers &amp; Get a Quote/);
  for (const path of ["https:\/\/mjengohub.co.ke\/media", "https:\/\/mjengonetworks.co.ke\/jobs-tenders", "https:\/\/mjengonetworks.co.ke\/events", "https:\/\/mjengonetworks.co.ke\/quote"]) assert.match(ecosystem, new RegExp(path));
});
