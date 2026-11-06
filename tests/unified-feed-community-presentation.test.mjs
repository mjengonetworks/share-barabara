import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("homepage keeps one Media & Feed heading above three unified activity cards", async () => {
  const source = await read("src/components/site/global-editorial-preview.tsx");
  assert.match(source, /getUnifiedFeed\(\{ limit: 18 \}/);
  assert.match(source, /module === "media" \? \(\["media", "media", "media"\]/);
  assert.match(source, /hideHeading=\{isMediaRow\}/);
  assert.match(source, /Media &amp; Feed/);
  assert.match(source, /UnifiedFeedActivity/);
});

test("community presentation preserves real attribution, relative time and compact fallbacks", async () => {
  const [activity, list, profiles] = await Promise.all([
    read("src/components/site/unified-feed-activity.tsx"),
    read("src/components/site/unified-feed-list.tsx"),
    read("src/lib/profiles.ts"),
  ]);
  assert.match(activity, /UserAvatar/);
  assert.match(activity, /timeAgo\(timestamp\)/);
  assert.match(activity, /item\.authorId/);
  assert.match(activity, /Share Barabara activity/);
  assert.match(list, /useProfileNames/);
  assert.match(list, /useProfileAvatars/);
  assert.match(profiles, /from\("profiles"\)/);
});

test("article and editorial sidebars use the same unified feed list", async () => {
  const [article, editorial] = await Promise.all([
    read("src/components/site/article-detail-sidebar.tsx"),
    read("src/components/site/editorial-sidebar.tsx"),
  ]);
  assert.match(article, /UnifiedFeedList items=\{latestFeed\}/);
  assert.match(editorial, /UnifiedFeedList items=\{feedItems\}/);
  assert.match(article, /getUnifiedFeed\(\{ limit: 3 \}/);
  assert.match(editorial, /getUnifiedFeed\(\{ limit: 3 \}/);
});
