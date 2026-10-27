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
  assert.match(feed, /pass automated safety checks publish immediately/);
  assert.doesNotMatch(feed, /Posts are reviewed for safety and community standards before publication/);
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
  assert.match(migration, /feed-media.*false/);
  assert.match(migration, /feed_media_owner_insert/);
  assert.match(migration, /metadata->>'size'/);
  assert.match(migration, /metadata->>'mimetype'/);
  assert.doesNotMatch(migration, /DROP POLICY.*"media_/);
  assert.doesNotMatch(migration, /bucket_id = 'media'/);
  assert.match(migration, /There is deliberately no client SELECT policy/);
  assert.doesNotMatch(migration, /public_url TEXT/);
  assert.match(read("src/lib/feed.functions.ts"), /feed_post_media/);
  assert.match(read("src/lib/feed.functions.ts"), /from\("feed-media"\)/);
  assert.match(read("src/lib/feed.functions.ts"), /schema\("storage"\)/);
  assert.match(read("src/lib/feed.functions.ts"), /owner_id/);
  assert.match(read("src/lib/feed.functions.ts"), /remove\(mediaPaths\)/);
  assert.match(read("src/lib/storage.ts"), /uploadFeedMediaAsset/);
  assert.match(read("src/lib/feed-media.functions.ts"), /createSignedUrl/);
  assert.match(read("src/lib/feed-media.functions.ts"), /SIGNED_URL_SECONDS/);
  assert.doesNotMatch(read("src/lib/feed-media.functions.ts"), /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(read("src/routes/feed.tsx"), /getFeedMediaSignedUrls/);
  assert.doesNotMatch(read("src/routes/feed.tsx"), /public_url/);
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

test("Cloudflare preview uses the Windows npx shim without changing deployment behavior", () => {
  const config = read("vite.config.ts");
  assert.match(config, /process\.platform === "win32"/);
  assert.match(config, /cmd\.exe \/d \/s \/c npx\.cmd/);
  assert.match(config, /preview:/);
  assert.match(config, /wrangler --cwd \.\/ dev/);
});

test("private Feed media never falls back to public object URLs", () => {
  const storage = read("src/lib/storage.ts");
  const mediaFn = read("src/lib/feed-media.functions.ts");
  const feed = read("src/routes/feed.tsx");
  assert.match(storage, /from\("feed-media"\)\.upload/);
  assert.doesNotMatch(storage, /feed-media[\s\S]*getPublicUrl/);
  assert.match(mediaFn, /from\("feed-media"\)[\s\S]*createSignedUrl/);
  assert.match(mediaFn, /SIGNED_URL_SECONDS = 15 \* 60/);
  assert.match(mediaFn, /post\.status === "published" \|\| post\.author_id === userId \|\| moderator/);
  assert.match(feed, /signedMedia\[media\.id\]\?\.signed_url/);
});

test("staging acceptance harness requires isolated credentials", () => {
  const script = read("scripts/verify-feed-media-staging.mjs");
  assert.match(script, /FEED_MEDIA_STAGING_URL/);
  assert.match(script, /FEED_MEDIA_STAGING_SERVICE_ROLE_KEY/);
  assert.match(script, /must be an explicitly isolated hosted staging project/);
  assert.match(script, /feed-media/);
  assert.match(script, /expired signed URLs cannot be reused/);
  assert.match(script, /existing public media bucket remains publicly readable/);
});
