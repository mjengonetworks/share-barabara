import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const feed = read("src/routes/feed.tsx");
const settings = read("src/components/site/blocked-accounts.tsx");
const admin = read("src/routes/_authenticated/admin/feed.tsx");
const moderation = read("src/lib/feed.functions.ts");
const migration = read("supabase/migrations/20261001110000_release_blocker_remediation_review.sql");

test("blocked accounts have owner-scoped listing and unblock controls", () => {
  assert.match(settings, /from\("feed_blocks"\)/);
  assert.match(settings, /eq\("blocker_id", user!\.id\)/);
  assert.match(settings, /Unblock/);
  assert.match(settings, /delete\(\)/);
  assert.match(migration, /feed_posts_public_published_read/);
  assert.match(migration, /NOT EXISTS \([\s\S]*feed_blocks/);
});

test("Feed distinguishes missing storage from a genuinely empty feed", () => {
  assert.match(feed, /Feed storage is not enabled yet/);
  assert.match(feed, /Community posts are unavailable/);
  assert.match(feed, /role="alert"/);
});

test("staff can review post and nested comment reports", () => {
  assert.match(admin, /feed_post_reports/);
  assert.match(admin, /content_requests/);
  assert.match(admin, /nested reply/);
  assert.match(admin, /Dismiss report/);
  assert.match(admin, /Remove comment/);
  assert.match(admin, /Restore comment/);
  assert.match(admin, /canReview/);
});

test("moderation history is append-only and staff-readable", () => {
  assert.match(migration, /moderation_action_history/);
  assert.match(migration, /moderator_id/);
  assert.match(migration, /previous_state JSONB/);
  assert.match(migration, /new_state JSONB/);
  assert.match(migration, /moderation_history_staff_read/);
  assert.match(migration, /REVOKE ALL ON public\.moderation_action_history/);
  assert.match(migration, /audit_feed_post_moderation/);
  assert.match(migration, /audit_comment_moderation/);
});

test("AI moderation fails closed into human review", () => {
  assert.match(moderation, /completeWithProvider\("groq"/);
  assert.match(moderation, /invalid action/);
  assert.match(moderation, /omitted a valid reason/);
  assert.match(moderation, /status = "pending"/);
  assert.match(moderation, /Never publish or rewrite the post/);
});

test("Feed notifications enforce publication, preferences, deduplication and blocks", () => {
  assert.match(migration, /status = 'published'/);
  assert.match(migration, /notifications_enabled AND community_enabled AND in_app_enabled/);
  assert.match(migration, /ON CONFLICT \(user_id, dedupe_key\)/);
  assert.match(migration, /feed_blocks WHERE blocker_id = owner/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.notify_on_reply/);
  assert.match(migration, /parent_status = 'removed'/);
});

test("Task 49 migration remains review-only and does not execute prior migrations", () => {
  assert.match(migration, /REVIEW ONLY/);
  assert.doesNotMatch(migration, /20260929120000|20260930170000/);
  assert.doesNotMatch(migration, /SearXNG|Task 25/i);
});
