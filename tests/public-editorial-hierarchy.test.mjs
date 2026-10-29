import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage recorded accidents card targets canonical statistics", () => {
  const source = read("src/routes/index.tsx");
  assert.match(source, /published_accident_report_count/);
  assert.match(source, /label="recorded road accidents"/);
  assert.match(source, /<Link to="\/statistics"[\s\S]{0,300}recordedAccidents/);
});

test("public report submission does not expose editorial AI controls", () => {
  const source = read("src/components/site/report-form.tsx");
  assert.match(source, /const editorialAccess = editorial && canReview/);
  assert.match(source, /editorialAccess \? \([\s\S]{0,500}Reviewer tools/);
});

test("shared preview cards use one lead plus two compact stories", () => {
  const source = read("src/components/site/global-editorial-preview.tsx");
  assert.match(source, /CompactItemLink/);
  assert.match(source, /items\.slice\(1, 3\)/);
  assert.match(source, /aspect-video w-full object-cover/);
  assert.match(source, /Read more/);
});

test("cross-platform previews stay inside the shared centred container", () => {
  const source = read("src/components/site/mjengo-previews.tsx");
  assert.match(source, /mx-auto w-full max-w-6xl px-4 sm:px-6/);
});

test("news hierarchy renders latest, featured and trending before categories", () => {
  const source = read("src/routes/news.index.tsx");
  const latest = source.lastIndexOf('title="Latest News"');
  const featured = source.lastIndexOf('title="Featured Articles"');
  const trending = source.lastIndexOf('title="Trending News"');
  const categories = source.lastIndexOf("Browse by Category");
  assert.ok(latest >= 0 && featured >= 0 && trending >= 0 && categories >= 0);
  assert.ok(latest < featured && featured < trending && trending < categories);
});

test("incident listings use separate full-card latest, featured and trending rows", () => {
  const reports = read("src/routes/reports.index.tsx");
  const alerts = read("src/routes/alerts.index.tsx");
  for (const source of [reports, alerts]) {
    assert.match(source, /slice\(0, 3\)\.map/);
    assert.match(source, /grid gap-5 sm:grid-cols-2 lg:grid-cols-3/);
    assert.match(source, /Read more/);
  }
  assert.match(reports, /trending_reports/);
  assert.match(alerts, /trending_alerts/);
});

test("News category columns contain one lead and two compact supporting stories", () => {
  const source = read("src/components/site/public-layout.tsx");
  assert.match(source, /const \[lead, \.\.\.supporting\] = articles\.slice\(0, 3\)/);
  assert.match(source, /supporting\.slice\(0, 2\)/);
  assert.match(source, /View more/);
});
