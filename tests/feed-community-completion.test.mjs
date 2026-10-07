import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const feed = fs.readFileSync("src/routes/feed.tsx", "utf8");
const comments = fs.readFileSync("src/components/site/comment-section.tsx", "utf8");
const commentServer = fs.readFileSync("src/lib/comment.functions.ts", "utf8");
const admin = fs.readFileSync("src/routes/_authenticated/admin/feed.tsx", "utf8");
const blocks = fs.readFileSync("src/components/site/blocked-accounts.tsx", "utf8");

test("Feed reporting and blocking are idempotent and self-blocking is rejected", () => {
  assert.match(feed, /feed_post_reports/) ;
  assert.match(feed, /ignoreDuplicates: true/);
  assert.match(feed, /feed_blocks/) ;
  assert.match(feed, /blockedId === user\.id/);
  assert.match(feed, /onConflict: "blocker_id,blocked_id"/);
  assert.match(blocks, /Unblock/);
});

test("comment creation validates thread ownership and duplicate reports server-side", () => {
  assert.match(commentServer, /parent\.entity_type !== data\.entityType/);
  assert.match(commentServer, /parent\.entity_id !== data\.entityId/);
  assert.match(commentServer, /parent\.moderation_status === "removed"/);
  assert.match(commentServer, /requireSupabaseAuth/);
  assert.match(commentServer, /content_requests/);
  assert.match(commentServer, /duplicate: true/);
});

test("removed parents do not orphan visible replies and reported comments show context", () => {
  assert.match(comments, /!comments\.some\(\(parent\) => parent\.id === c\.parent_comment_id\)/);
  assert.match(comments, /depth < 4/);
  assert.match(comments, /sm:ml-6/);
  assert.match(admin, /Open parent discussion/);
  assert.match(admin, /moderated_by/);
  assert.match(admin, /Report ID/);
});
