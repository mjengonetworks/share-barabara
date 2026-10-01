import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const route = read("src/routes/feed.tsx");
const migration = read("supabase/migrations/20261001100000_feed_community_review.sql");
const header = read("src/components/site/site-header.tsx");
const moderation = read("src/lib/feed.functions.ts");
const admin = read("src/routes/_authenticated/admin/feed.tsx");

test("Feed route and prominent main navigation exist", () => {
  assert.match(route, /createFileRoute\("\/feed"\)/);
  assert.match(header, /to: "\/feed", label: "Feed"/);
  assert.match(route, /Sort:|latest|popular|trending/);
});

test("community posts have bounded body and conservative moderation states", () => {
  assert.match(migration, /char_length\(btrim\(body\)\) BETWEEN 3 AND 4000/);
  assert.match(migration, /status IN \('pending','published','removed','hidden'\)/);
  assert.match(migration, /moderation_status TEXT.*pending.*approved.*rejected.*needs_review/s);
  assert.match(route, /Posts are reviewed/);
});

test("automatic content uses existing public visibility semantics", () => {
  assert.match(route, /from\("alerts"\)[\s\S]*eq\("status", "active"\)/);
  assert.match(route, /from\("accident_reports"\)[\s\S]*eq\("status", "approved"\)/);
  assert.match(route, /from\("news"\)[\s\S]*eq\("status", "published"\)/);
});

test("Feed reuses existing votes and threaded comments", () => {
  assert.match(migration, /feed_post/);
  assert.match(migration, /votes_entity_type_check/);
  assert.match(route, /useVotes\("feed_post"/);
  assert.match(route, /CommentSection entityType="feed_post"/);
  assert.match(read("src/components/site/comment-section.tsx"), /"feed_post"/);
});

test("hashtags and trend ordering are bounded and deterministic", async () => {
  const { extractFeedHashtags, trendCounts, feedSort } = await import("../src/lib/feed.mjs");
  assert.deepEqual(extractFeedHashtags("#RoadSafety #roadsafety #Theft"), ["roadsafety", "theft"]);
  assert.deepEqual(trendCounts([{ hashtags: ["roadsafety", "roadsafety"] }, { hashtags: ["theft"] }]), [{ tag: "roadsafety", count: 2 }, { tag: "theft", count: 1 }]);
  assert.equal(feedSort([{ id: "a", score: 1, created_at: "2026-01-01" }, { id: "b", score: 3, created_at: "2025-01-01" }], "popular")[0].id, "b");
});

test("Feed RLS is owner-scoped and public reads are published-only unless privileged", () => {
  assert.match(migration, /feed_posts_public_published_read/);
  assert.match(migration, /status = 'published' OR author_id = auth\.uid\(\) OR public\.has_min_role\(auth\.uid\(\), 'moderator'\)/);
  assert.match(migration, /feed_posts_insert_own_pending/);
  assert.match(migration, /author_id = auth\.uid\(\) AND status = 'pending'/);
});

test("reporting and blocking are private-owner operations with moderation access", () => {
  assert.match(migration, /feed_post_reports/);
  assert.match(migration, /UNIQUE \(post_id, reporter_id\)/);
  assert.match(migration, /feed_blocks/);
  assert.match(migration, /blocker_id = auth\.uid\(\)/);
  assert.match(route, /Report Feed post/);
  assert.match(route, /Block/);
  assert.match(route, /feed-blocks/);
  assert.match(route, /blockedRows\.map/);
});

test("AI moderation is server-only Groq triage and never autonomous publication", () => {
  assert.match(moderation, /requireSupabaseAuth/);
  assert.match(moderation, /completeWithProvider\("groq"/);
  assert.match(moderation, /status = "pending"/);
  assert.match(moderation, /Never publish or rewrite the post/);
  assert.doesNotMatch(moderation, /service_role|VAPID_PRIVATE|SearXNG/i);
});

test("moderators have a human Feed review queue", () => {
  assert.match(admin, /createFileRoute\("\/_authenticated\/admin\/feed"\)/);
  assert.match(admin, /canReview/);
  assert.match(admin, /Publish/);
  assert.match(admin, /Reject/);
  assert.match(admin, /Hide for review/);
  assert.match(admin, /published_at: status === "published"/);
  assert.match(read("src/routes/_authenticated/admin/route.tsx"), /Feed Posts/);
});

test("Feed community events connect to existing notifications", () => {
  assert.match(migration, /notify_on_feed_comment/);
  assert.match(migration, /Someone joined your Feed discussion/);
  assert.match(migration, /NEW\.entity_type = 'feed_post'/);
  assert.match(migration, /community_enabled AND in_app_enabled/);
});

test("no private profile data is selected for public Feed cards", () => {
  assert.match(route, /useProfileNames/);
  assert.match(route, /useProfileUsernames/);
  assert.doesNotMatch(route, /email|notification_preferences|latitude|longitude|payment/i);
});

test("Feed has no Task 25 or SearXNG runtime dependency", () => {
  assert.doesNotMatch(route, /SearXNG|SEARXNG|agent|Task 25/i);
  assert.doesNotMatch(migration, /SearXNG|Task 25/i);
});
