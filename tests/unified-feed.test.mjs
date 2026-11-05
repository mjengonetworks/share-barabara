import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("the shared feed reads every approved public activity source", async () => {
  const source = await read("src/lib/unified-feed.ts");
  for (const table of [
    'from("news")',
    'from("alerts")',
    'from("accident_reports")',
    'from("infrastructure_issues")',
    'from("campaigns")',
    'from("videos")',
    'from("feed_posts")',
    'from("feed_post_media")',
    'from("editorial_updates")',
  ]) {
    assert.match(source, new RegExp(table.replace(/[()]/g, "\\$&")), table);
  }
  assert.match(source, /status\", \"published\"/);
  assert.match(source, /moderation_status\", \"approved\"/);
  assert.match(source, /deleted_at/);
  assert.match(source, /new Map\(filtered\.map/);
});

test("feed and homepage preview consume the same retrieval layer", async () => {
  const [feed, preview] = await Promise.all([
    read("src/routes/feed.tsx"),
    read("src/components/site/global-editorial-preview.tsx"),
  ]);
  assert.match(feed, /getUnifiedFeed\(\{ limit: FEED_LIMIT, query: q \}/);
  assert.match(preview, /getUnifiedFeed\(\{ limit: 18 \}/);
  assert.match(preview, /destination: \"media\"/);
  assert.match(feed, /Administrator update/);
});

test("shared feed preserves canonical source identity and media metadata", async () => {
  const source = await read("src/lib/unified-feed.ts");
  assert.match(source, /key: `\$\{kind\}:\$\{row\.id\}`/);
  assert.match(source, /sourceId: row\.id/);
  assert.match(source, /href: hrefFor\(kind, row\)/);
  assert.match(source, /imageUrl: row\.image_url/);
  assert.match(source, /mediaUrl: row\.video_url/);
  assert.match(source, /updatedAt: row\.updated_at/);
  assert.match(source, /mediaByPost/);
  assert.match(source, /slice\(offset, offset \+ limit\)/);
});
