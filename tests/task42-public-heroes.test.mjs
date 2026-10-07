import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const header = read("src/components/site/site-header.tsx");
const footer = read("src/components/site/site-footer.tsx");
const hero = read("src/components/site/public-page-hero.tsx");
const news = read("src/routes/news.index.tsx");
const search = read("src/routes/search.tsx");
const detail = read("src/routes/news.$slug.tsx");
const routes = [
  "src/routes/news.index.tsx",
  "src/routes/alerts.index.tsx",
  "src/routes/reports.index.tsx",
  "src/routes/campaigns.tsx",
  "src/routes/videos.tsx",
  "src/routes/merch.tsx",
  "src/routes/partner-with-us.tsx",
  "src/routes/contributors.tsx",
  "src/routes/statistics.tsx",
].map(read);

test("public navigation uses News & Articles while preserving /news", () => {
  assert.match(header, /to: "\/news", label: "News & Articles"/);
  assert.match(footer, /to="\/news">News &amp; Articles/);
  assert.match(news, /createFileRoute\("\/news\/"\)/);
  assert.match(news, /title="News & Articles"/);
  assert.match(search, /News &amp; Articles/);
  assert.match(detail, /News &amp; Articles/);
  assert.doesNotMatch(header, /news-and-articles/);
});

test("landing pages share one compact, responsive, accessible hero primitive", () => {
  assert.match(hero, /export function PublicPageHero/);
  assert.match(hero, /<h1/);
  assert.match(hero, /aria-labelledby/);
  assert.match(hero, /sm:py-9/);
  assert.match(hero, /sm:text-4xl/);
  for (const source of routes) assert.match(source, /PublicPageHero/);
});

test("hero copy is page-specific and avoids unsupported claims", () => {
  assert.match(read("src/routes/alerts.index.tsx"), /Current hazards, closures and disruptions/);
  assert.match(read("src/routes/reports.index.tsx"), /Browse approved road-safety reports/);
  assert.match(read("src/routes/campaigns.tsx"), /Explore Share Barabara campaigns/);
  assert.match(read("src/routes/videos.tsx"), /Watch road-safety and transport stories/);
  assert.match(read("src/routes/merch.tsx"), /Wear and share the message/);
  assert.match(read("src/routes/partner-with-us.tsx"), /partnership, campaign and advertising opportunities/);
  assert.match(read("src/routes/contributors.tsx"), /Payment, roles and verification do not determine rank/);
  assert.match(read("src/routes/statistics.tsx"), /separate picture of what Share Barabara users have reported/);
  assert.doesNotMatch(read("src/routes/statistics.tsx"), /13 deaths every day/i);
  assert.doesNotMatch(read("src/routes/alerts.index.tsx"), /verified incidents|real-time coverage guarantee/i);
});

test("hero imagery stays local and does not add an external provider dependency", () => {
  assert.match(news, /@\/assets\/hero-road\.jpg/);
  assert.doesNotMatch(hero, /https?:\/\//i);
  for (const source of routes) assert.doesNotMatch(source, /SearXNG|Task 25|agent/i);
});
