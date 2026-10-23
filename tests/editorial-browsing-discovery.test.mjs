import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(file, "utf8");

test("alternating browsing variants and verified discovery destinations are wired", async () => {
  const [layout, discovery, news, alerts, reports, feed, statistics, campaigns, infrastructure] =
    await Promise.all([
      source("src/components/site/public-layout.tsx"),
      source("src/components/site/editorial-discovery.tsx"),
      source("src/routes/news.index.tsx"),
      source("src/routes/alerts.index.tsx"),
      source("src/routes/reports.index.tsx"),
      source("src/routes/feed.tsx"),
      source("src/routes/statistics.tsx"),
      source("src/routes/campaigns.tsx"),
      source("src/routes/infrastructure-issues.index.tsx"),
    ]);

  assert.match(layout, /variant === "equal"/);
  assert.match(layout, /featured-compact/);
  assert.match(layout, /variant=\{index % 2 === 0 \? "equal" : "featured-compact"\}/);
  assert.match(layout, /variantOffset = 0/);
  assert.match(layout, /supporting\.slice\(0, 2\)/);

  for (const route of [news, alerts, reports, feed, statistics, campaigns, infrastructure]) {
    assert.match(route, /EditorialDiscoveryRail/);
  }
  for (const path of ["/news", "/alerts", "/reports", "/statistics", "/feed", "/campaigns", "/infrastructure-issues", "/pages/"]) {
    assert.ok(discovery.includes(`to: "${path}"`), `missing verified discovery path ${path}`);
  }
  assert.doesNotMatch(discovery, /to: "\/categories"/);
});

test("discovery and browsing continue to use approved ad architecture", async () => {
  const [interleave, news, alerts, reports, infrastructure] = await Promise.all([
    source("src/components/site/ad-interleave.tsx"),
    source("src/routes/news.index.tsx"),
    source("src/routes/alerts.index.tsx"),
    source("src/routes/reports.index.tsx"),
    source("src/routes/infrastructure-issues.index.tsx"),
  ]);
  assert.match(interleave, /BannerAd/);
  for (const route of [news, alerts, reports, infrastructure]) assert.match(route, /BannerAd/);
});
