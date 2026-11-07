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
  assert.match(activity, /Discussion/);
  assert.match(activity, /Open activity/);
  assert.match(activity, /identity\?\.username/);
  assert.match(activity, /Share Barabara activity/);
  assert.match(activity, /onError=\{\(\) => setImageFailed\(true\)\}/);
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

test("homepage preview resolves identities by the unified activity author", async () => {
  const source = await read("src/components/site/global-editorial-preview.tsx");
  assert.match(source, /identities\?\.\[items\[0\]\.activity\?\.authorId \?\? items\[0\]\.id\]/);
  assert.match(source, /identities\?\.\[item\.activity\?\.authorId \?\? item\.id\]/);
});

test("Media & Feed uses shared alternating surfaces and yellow activity pills", async () => {
  const [activity, preview] = await Promise.all([
    read("src/components/site/unified-feed-activity.tsx"),
    read("src/components/site/global-editorial-preview.tsx"),
  ]);
  for (const token of ["#FFFFFF", "#EAF3FF", "#102653", "#F5B51B", "#101F43"]) {
    assert.match(`${activity}\n${preview}`, new RegExp(token.replace("#", "\\#")));
  }
  assert.match(preview, /\["white", "blue", "navy"\]/);
  assert.match(activity, /FeedSurfaceTone/);
  assert.match(activity, /identity\?\.username/);
});

test("windowed Media & Feed ranking is latest-first, bounded and deduplicated", async () => {
  const { buildMediaFeedGroups } = await import("../src/lib/media-feed-ranking.ts");
  const item = (key, publishedAt) => ({
    key,
    kind: "article",
    title: key,
    body: "",
    publishedAt,
    createdAt: publishedAt,
  });
  const items = Array.from({ length: 9 }, (_, index) =>
    item(`item-${index + 1}`, `2026-11-07T0${index}:00:00.000Z`),
  );
  const events = [
    ...Array.from({ length: 4 }, () => ({
      activityKey: "item-4",
      viewedAt: "2026-11-07T09:00:00.000Z",
    })),
    ...Array.from({ length: 2 }, () => ({
      activityKey: "item-5",
      viewedAt: "2026-11-07T08:00:00.000Z",
    })),
    ...Array.from({ length: 3 }, () => ({
      activityKey: "item-6",
      viewedAt: "2026-11-06T20:00:00.000Z",
    })),
  ];
  const groups = buildMediaFeedGroups(items, events, "2026-11-07T10:00:00.000Z");
  assert.deepEqual(
    groups.latest.map((entry) => entry.key),
    ["item-9", "item-8", "item-7"],
  );
  assert.deepEqual(
    groups.twelveHours.map((entry) => entry.key),
    ["item-4", "item-5"],
  );
  assert.deepEqual(
    groups.twentyFourHours.map((entry) => entry.key),
    ["item-6"],
  );
  assert.equal(
    new Set(
      [...groups.latest, ...groups.twelveHours, ...groups.twentyFourHours].map(
        (entry) => entry.key,
      ),
    ).size,
    6,
  );
  assert.deepEqual(buildMediaFeedGroups(items, null, "2026-11-07T10:00:00.000Z").twelveHours, []);
});
