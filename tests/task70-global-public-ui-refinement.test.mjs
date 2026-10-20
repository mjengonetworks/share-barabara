import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const article = read("src/routes/news.$slug.tsx");
const alertDetail = read("src/routes/alerts.$alertId.tsx");
const reportDetail = read("src/routes/reports.$reportId.tsx");
const campaignDetail = read("src/routes/campaigns.$slug.tsx");
const shell = read("src/components/site/public-layout.tsx");
const sidebar = read("src/components/site/article-detail-sidebar.tsx");
const discovery = read("src/components/site/discovery-sections.tsx");
const ads = read("src/components/site/banner-ad.tsx");

test("public detail columns start independently and end at natural content height", () => {
  for (const source of [article, alertDetail, reportDetail, campaignDetail]) {
    assert.match(source, /grid[\s\S]{0,80}items-start/);
  }
  assert.match(shell, /grid w-full max-w-\[1500px\] items-start/);
});

test("detail spacing is compact without touching the approved share toolbar", () => {
  assert.match(article, /py-2 sm:gap-5 sm:px-6 sm:py-4/);
  assert.match(article, /sm:rounded-2xl sm:p-5 lg:p-6/);
  assert.match(article, /ArticleShareToolbar/);
  assert.doesNotMatch(article, /ArticleShareToolbar[\s\S]*grid-cols-2/);
});

test("recommendation badges use the reusable golden treatment", () => {
  const ui = read("src/components/site/public-ui.tsx");
  assert.match(ui, /publicRecommendationBadgeClass/);
  assert.match(ui, /bg-amber-200/);
  assert.match(sidebar, /publicRecommendationBadgeClass/);
  assert.match(discovery, /bg-amber-200/);
});

test("ecosystem cards use the exact approved copy and omit the old slogan", () => {
  assert.match(discovery, /documentation from Kenya and beyond/);
  assert.match(
    discovery,
    /Find rated fundis, contractors, consultants and other professionals and service providers, with pricing, material price indices and automated quote generation from registered suppliers\./,
  );
  assert.doesNotMatch(discovery, /Across our ecosystem/);
});

test("sidebar inserts the shared ad slot directly after categories", () => {
  assert.match(sidebar, /Browse articles by category[\s\S]*article-sidebar-after-categories/);
});

test("generic seeded placeholder ads are filtered while genuine ads and fallback remain", () => {
  assert.match(ads, /eligibleAds = ads\.filter/);
  assert.match(ads, /emergency response, 24\\\/7|genuine parts, trusted fit/);
  assert.match(ads, /Your Ad Here/);
  assert.match(ads, /partner-with-us/);
  assert.match(ads, /data-ad-placement/);
});

test("approved share toolbar remains delegated to the shared component", () => {
  const toolbar = read("src/components/site/article-share-toolbar.tsx");
  assert.match(toolbar, /GOOGLE_NEWS_SEARCH_URL/);
  assert.match(toolbar, /GoogleNewsLogo/);
  assert.match(toolbar, /share-toolbar-actions/);
  assert.doesNotMatch(toolbar, /q=mjengo%20hub/);
});
