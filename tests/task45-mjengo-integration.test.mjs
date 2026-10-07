import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const adapter = fs.readFileSync("src/lib/mjengo.functions.ts", "utf8");
const previews = fs.readFileSync("src/components/site/mjengo-previews.tsx", "utf8");
const routes = ["src/routes/index.tsx", "src/routes/news.index.tsx", "src/routes/alerts.index.tsx", "src/routes/reports.index.tsx", "src/routes/statistics.tsx", "src/routes/videos.tsx"].map((file) => fs.readFileSync(file, "utf8"));

test("Mjengo adapter uses the public RSS and bounded public page contracts", () => {
  assert.match(adapter, /https:\/\/mjengohub\.co\.ke/);
  assert.match(adapter, /fetchText\("\/rss\.xml"\)/);
  assert.match(adapter, /fetchText\("\/projects"\)/);
  assert.match(adapter, /fetchText\("\/media"\)/);
  assert.match(adapter, /AbortController/);
  assert.match(adapter, /MAX_BODY/);
  assert.match(adapter, /CACHE_TTL/);
});

test("article normalization preserves source identity, category, dates and optional images", () => {
  assert.match(adapter, /canonicalUrl/);
  assert.match(adapter, /publishedAt/);
  assert.match(adapter, /category: field\(block, "category"\)/);
  assert.match(adapter, /imageUrl: safeUrl\(image, \[MEDIA_ORIGIN\]\)/);
});

test("project previews expose only source-provided tracker fields", () => {
  assert.match(adapter, /title: title\.slice/);
  assert.match(adapter, /location: location/);
  assert.match(adapter, /status: status/);
  assert.match(adapter, /<a\\s\+href=\["'\]\(\\\/projects\\\//);
  assert.doesNotMatch(adapter, /budget|completionPercentage|invent/i);
});

test("media previews use public YouTube links and safe thumbnails", () => {
  assert.match(adapter, /www\\\.youtube\\\.com\\\/watch/);
  assert.match(adapter, /i\.ytimg\.com/);
  assert.match(adapter, /mp-yt-card/);
});

test("external URL handling is allowlisted and canonical links stay HTTPS", () => {
  assert.match(adapter, /url\.protocol !== "https:"/);
  assert.match(adapter, /origins\.includes\(url\.origin\)/);
  assert.match(adapter, /url\.hash = ""/);
  assert.match(previews, /target="_blank" rel="noopener noreferrer"/);
});

test("upstream failure returns an empty result rather than breaking pages", () => {
  assert.match(adapter, /if \(!articles\.length && !projectRows\.length && !mediaRows\.length\) return emptyContent\(\)/);
  assert.match(previews, /if \(!data \|\| data\.status !== "ok"\) return null/);
});

test("homepage and major public pages use the shared native preview module", () => {
  assert.equal(routes.filter((source) => source.includes("<MjengoPreviews")).length, 6);
  assert.match(previews, /Navy|Source: Mjengo Hub|From Mjengo Hub|Project Tracker/);
});

test("content remains clearly attributed and does not copy into Share Barabara records", () => {
  assert.match(previews, /Source: Mjengo Hub/);
  assert.match(previews, /external source previews/);
  assert.doesNotMatch(adapter, /supabase|insert\(|upsert\(/);
});

test("bounded result counts and caching prevent repeated upstream waterfalls", () => {
  assert.match(adapter, /MAX_ITEMS = 6/);
  assert.match(adapter, /Promise\.all\(\[fetchText/);
  assert.match(adapter, /cached && cached\.expiresAt > Date\.now\(\)/);
  assert.match(previews, /staleTime: 300_000/);
});

test("Task 45 does not activate SearXNG, agents, or provider credentials", () => {
  assert.doesNotMatch(adapter, /SEARXNG|VAPID|service.?role|createAgent/i);
  assert.doesNotMatch(previews, /fetch\(/);
});
