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

test("shared preview cards use equal image-led cards and explicit read-more links", () => {
  const source = read("src/components/site/global-editorial-preview.tsx");
  assert.match(source, /grid gap-3 sm:grid-cols-3/);
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
  const featured = source.lastIndexOf('title="Featured News"');
  const trending = source.lastIndexOf('title="Trending News"');
  const categories = source.lastIndexOf("Browse by Category");
  assert.ok(latest >= 0 && featured >= 0 && trending >= 0 && categories >= 0);
  assert.ok(latest < featured && featured < trending && trending < categories);
});
