import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const server = read("src/lib/feed.functions.ts");
const route = read("src/routes/feed.tsx");
const schema = read("supabase/migrations/20261001100000_feed_community_review.sql");

test("automated allow publishes through the authenticated server path", () => {
  assert.match(server, /moderation\.action === "allow" \? "published"/);
  assert.match(server, /moderation\.action === "allow"[\s\S]*?"approved"/);
  assert.match(server, /publishedAt = status === "published"/);
  assert.match(server, /supabaseAdmin\.from\("feed_posts"\)/);
  assert.match(server, /supabaseAdmin\.from\("feed_post_media"\)/);
});

test("flagged and rejected posts remain held for moderator workflow", () => {
  assert.match(server, /moderation\.action === "reject"[\s\S]*?"rejected"/);
  assert.match(server, /: "needs_review"/);
  assert.match(server, /status = moderation\.action === "allow" \? "published" : "pending"/);
  assert.match(route, /Held for a safety review/);
  assert.match(route, /Awaiting moderator review/);
});

test("direct client inserts remain pending-only under RLS", () => {
  assert.match(schema, /WITH CHECK \(author_id = auth\.uid\(\) AND status = 'pending' AND moderation_status = 'pending'\)/);
  assert.match(server, /Direct client inserts remain constrained by the pending-only RLS policy/);
  assert.doesNotMatch(server, /data\.(status|moderation_status|moderation|action)/);
});

test("held or rejected posts are not public", () => {
  assert.match(schema, /USING \(status = 'published' OR author_id = auth\.uid\(\) OR public\.has_min_role/);
  assert.match(server, /status = moderation\.action === "allow" \? "published" : "pending"/);
});

test("Feed uses one responsive three-column desktop surface without fake navigation", () => {
  assert.match(route, /lg:grid-cols-\[220px_minmax\(0,1fr\)_280px\]/);
  assert.match(route, /aria-label="Feed navigation"/);
  assert.match(route, /lg:sticky lg:top-24/);
  assert.match(route, /Trending topics/);
  assert.match(route, /Community standards/);
  assert.match(route, /Messages are not available yet/);
  assert.match(route, /Calls are not available yet/);
  assert.doesNotMatch(route, /to="\/messages"/);
  assert.doesNotMatch(route, /to="\/calls"/);
});
