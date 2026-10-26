import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("Media & Feed exposes the compact reference structure and real navigation", () => {
  const feed = read("src/routes/feed.tsx");
  assert.match(feed, /Search Media & Feed/);
  assert.match(feed, /Media Directory/);
  assert.match(feed, /For You/);
  assert.match(feed, /Following/);
  assert.match(feed, /Trending/);
  assert.match(feed, /Topics/);
  assert.match(feed, /Discussions/);
  assert.match(feed, /timeline\.map/);
  assert.match(feed, /Open canonical source/);
  assert.match(feed, /Posts are reviewed/);
  assert.match(feed, /Attach photo\/video/);
  assert.match(feed, /Comments \(/);
  assert.match(feed, /Share/);
  assert.match(feed, /trending_news/);
  assert.match(feed, /view === "discussions"/);
  assert.match(feed, /view === "topics"/);
  assert.match(feed, /Following.*follow relationship model/s);
  assert.doesNotMatch(feed, /Messages.*to="\/messages"/s);
  assert.doesNotMatch(feed, /Calls.*to="\/calls"/s);
});

test("Media Directory and detail view preserve canonical media links and proportions", () => {
  const directory = read("src/routes/media.tsx");
  const detail = read("src/routes/media.$mediaId.tsx");
  assert.match(directory, /createFileRoute\("\/media"\)/);
  assert.match(directory, /aspect-video/);
  assert.match(directory, /to="\/media\/\$mediaId"/);
  assert.match(directory, /Media Directory/);
  assert.match(detail, /createFileRoute\("\/media\/\$mediaId"\)/);
  assert.match(detail, /Open canonical media source/);
  assert.match(detail, /target="_blank"/);
});

test("Feed media upload schema is review-only and ownership protected", () => {
  const migration = read("supabase/migrations/20261026120000_feed_post_media_review.sql");
  assert.match(migration, /REVIEW ONLY/);
  assert.match(migration, /feed_post_media/);
  assert.match(migration, /owner_id = auth\.uid\(\)/);
  assert.match(migration, /p\.status = 'published'/);
  assert.match(migration, /storage_path_owner_check/);
  assert.match(migration, /bytes BETWEEN 1 AND 52428800/);
  assert.match(migration, /Rollback safety/);
  assert.match(migration, /moderator/);
  assert.match(read("src/lib/feed.functions.ts"), /feed_post_media/);
  assert.match(read("src/lib/storage.ts"), /uploadMediaAsset/);
});

test("Media admin remains inside the existing authenticated CMS", () => {
  const admin = read("src/routes/_authenticated/admin/videos.tsx");
  const nav = read("src/routes/_authenticated/admin/route.tsx");
  assert.match(admin, /Media library/);
  assert.match(admin, /Search media/);
  assert.match(admin, /Feature/);
  assert.match(admin, /Reject/);
  assert.match(admin, /moveToRecycleBin/);
  assert.match(nav, /\/admin\/videos.*Media library/);
});

test("Existing persistent engagement and moderation primitives remain wired", () => {
  const feed = read("src/routes/feed.tsx");
  assert.match(feed, /useVotes\("feed_post"/);
  assert.match(feed, /CommentSection entityType="feed_post"/);
  assert.match(feed, /feed_post_reports/);
  assert.match(feed, /feed_blocks/);
  assert.match(feed, /moveToRecycleBin\("feed_post"/);
});
