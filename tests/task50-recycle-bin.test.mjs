import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const migration = read("supabase/migrations/20261001120000_recycle_bin_review.sql");

test("Task 50 migration is review-only and covers eligible content types", () => {
  assert.match(migration, /TASK 50 REVIEW-ONLY MIGRATION/);
  for (const type of ["alert", "report", "article", "feed_post", "comment", "video", "infrastructure_issue", "campaign", "page"]) {
    assert.match(migration, new RegExp(`'${type}'`));
  }
  assert.match(migration, /snapshot JSONB NOT NULL/);
});

test("deletion origin separates user and admin actions", () => {
  assert.match(migration, /deletion_origin TEXT NOT NULL CHECK \(deletion_origin IN \('user', 'admin'\)\)/);
  assert.match(migration, /public\.has_role\(actor, 'admin'\)/);
  assert.match(migration, /ELSIF owner = actor THEN origin := 'user'/);
  assert.doesNotMatch(migration, /deletion_origin.*moderation/);
});

test("owner and admin RLS boundaries are explicit", () => {
  assert.match(migration, /deletion_origin = 'user' AND owner_id = auth\.uid\(\)/);
  assert.match(migration, /public\.has_role\(auth\.uid\(\), 'admin'\)/);
  assert.match(migration, /Only the owner may restore this item/);
  assert.match(migration, /Not authorized to permanently delete this item/);
});

test("restore preserves source rows and permanent delete guards replies", () => {
  assert.match(migration, /UPDATE public\.recycle_bin_items SET status = 'restored'/);
  assert.match(migration, /parent_comment_id = item\.content_id/);
  assert.match(migration, /Restore or remove replies before permanently deleting this comment/);
  assert.match(migration, /recycle_bin_history/);
});

test("public policies exclude soft-deleted content", () => {
  for (const table of ["news", "alerts", "accident_reports", "comments", "videos", "infrastructure_issues", "campaigns", "feed_posts", "pages"]) {
    assert.match(migration, new RegExp(`ON public\\.${table} FOR SELECT`));
  }
  assert.ok((migration.match(/deleted_at IS NULL/g) ?? []).length >= 9);
  assert.match(migration, /comments_public_read_active ON public\.comments/);
});

test("user and admin interfaces remain separate", () => {
  const userRoute = read("src/routes/recycle-bin.tsx");
  const adminRoute = read("src/routes/_authenticated/admin/recycle-bin.tsx");
  assert.match(userRoute, /deletion_origin.*user/);
  assert.match(userRoute, /My Recycle Bin/);
  assert.match(adminRoute, /rank < ROLE_RANK\.admin/);
  assert.match(adminRoute, /deletion_origin.*admin/);
  assert.match(adminRoute, /Deletion history/);
});

test("permanent deletion requires explicit confirmation in both surfaces", () => {
  assert.match(read("src/routes/recycle-bin.tsx"), /window\.confirm\("Permanently delete this content\?/);
  assert.match(read("src/routes/_authenticated/admin/recycle-bin.tsx"), /window\.confirm\("Permanently delete this content/);
  assert.match(read("src/lib/recycle-bin.mjs"), /recycle_bin_permanently_delete/);
});

test("eligible legacy hard-delete handlers use the recycle-bin RPC seam", () => {
  for (const path of [
    "src/routes/_authenticated/admin/alerts.tsx",
    "src/routes/_authenticated/admin/reports.tsx",
    "src/routes/_authenticated/admin/articles.tsx",
    "src/routes/_authenticated/admin/comments.tsx",
    "src/routes/_authenticated/admin/videos.tsx",
    "src/routes/_authenticated/admin/pages.tsx",
    "src/components/site/comment-section.tsx",
  ]) {
    assert.match(read(path), /moveToRecycleBin/);
  }
});

test("moderation removals remain outside the recycle-bin origin model", () => {
  assert.match(migration, /moderation removal/);
  assert.match(read("src/routes/_authenticated/admin/feed.tsx"), /status: \"removed\"/);
  assert.match(read("src/routes/_authenticated/admin/feed.tsx"), /Moderation note/);
});
