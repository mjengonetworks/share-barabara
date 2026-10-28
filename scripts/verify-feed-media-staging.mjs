import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/*
 * Destructive only to disposable records/objects created by this run.
 * Never point these variables at production. The script refuses the public
 * Share Barabara host and does not read the repository .env file.
 *
 * Required:
 *   FEED_MEDIA_STAGING_URL
 *   FEED_MEDIA_STAGING_PUBLISHABLE_KEY
 *   FEED_MEDIA_STAGING_SERVICE_ROLE_KEY
 *
 * The target must already contain the application migrations, including
 * 20261026120000_feed_post_media_review.sql.
 */

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}; refusing to use repository or production credentials.`);
  return value;
};

const url = required("FEED_MEDIA_STAGING_URL").replace(/\/$/, "");
if (/sharebarabara\.co\.ke|localhost|127\.0\.0\.1/i.test(url)) {
  throw new Error("FEED_MEDIA_STAGING_URL must be an explicitly isolated hosted staging project, not production or local fallback.");
}

const publishableKey = required("FEED_MEDIA_STAGING_PUBLISHABLE_KEY");
const serviceRoleKey = required("FEED_MEDIA_STAGING_SERVICE_ROLE_KEY");
const anon = () => createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = `FeedMedia-${randomUUID()}-Aa1!`;
const users = [];
const objects = [];
const posts = [];

function check(condition, message) {
  assert.ok(condition, message);
  console.log(`PASS ${message}`);
}

async function createTestUser(label) {
  const email = `feed-media-${label}-${runId}@example.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  users.push(data.user.id);
  const client = anon();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id: data.user.id, client };
}

async function createPost(user, status = "pending") {
  const { data, error } = await user.client.from("feed_posts").insert({
    author_id: user.id,
    body: `Private Feed media acceptance ${runId}`,
    hashtags: ["feed-media-acceptance"],
    status,
    moderation_status: "pending",
  }).select("id").single();
  if (error) throw error;
  posts.push(data.id);
  return data.id;
}

async function upload(client, userId, path, contentType = "image/png", bytes = new Uint8Array([137, 80, 78, 71]), bucket = "feed-media") {
  const { error } = await client.storage.from(bucket).upload(path, new Blob([bytes], { type: contentType }), {
    contentType,
    upsert: false,
  });
  return error;
}

async function removeObject(path) {
  await admin.storage.from("feed-media").remove([path]);
}

async function main() {
  const owner = await createTestUser("owner");
  const other = await createTestUser("other");
  const moderator = await createTestUser("moderator");
  const { error: roleError } = await admin.from("user_roles").insert({ user_id: moderator.id, role: "moderator" });
  if (roleError) throw roleError;

  const pendingPost = await createPost(owner);
  const pendingPath = `${owner.id}/${runId}-pending.png`;
  objects.push(pendingPath);
  check(!(await upload(owner.client, owner.id, pendingPath)), "owner can upload a pending image");

  const { error: ownerMetadataError } = await owner.client.from("feed_post_media").insert({
    post_id: pendingPost,
    owner_id: owner.id,
    media_type: "image",
    bucket_id: "feed-media",
    storage_path: pendingPath,
    filename: "pending.png",
    mime_type: "image/png",
    bytes: 4,
  });
  check(!ownerMetadataError, "owner can attach metadata to the owner pending post");

  const { data: ownerRows } = await owner.client.from("feed_post_media").select("id").eq("post_id", pendingPost);
  check(ownerRows?.length === 1, "owner can read pending attachment metadata");
  const { data: otherRows } = await other.client.from("feed_post_media").select("id").eq("post_id", pendingPost);
  check(!otherRows?.length, "other authenticated users cannot read pending attachment metadata");
  const { data: anonRows } = await anon().from("feed_post_media").select("id").eq("post_id", pendingPost);
  check(!anonRows?.length, "anonymous users cannot read pending attachment metadata");
  const { data: moderatorRows } = await moderator.client.from("feed_post_media").select("id").eq("post_id", pendingPost);
  check(moderatorRows?.length === 1, "moderators can read pending attachment metadata");

  const { error: otherDownloadError } = await other.client.storage.from("feed-media").download(pendingPath);
  check(Boolean(otherDownloadError), "other authenticated users cannot directly download pending media");
  const { error: anonymousDownloadError } = await anon().storage.from("feed-media").download(pendingPath);
  check(Boolean(anonymousDownloadError), "anonymous users cannot directly download pending media");

  const { error: crossDeleteError } = await other.client.storage.from("feed-media").remove([pendingPath]);
  check(Boolean(crossDeleteError), "cross-account delete is rejected");
  const { error: duplicateError } = await owner.client.from("feed_post_media").insert({
    post_id: pendingPost, owner_id: owner.id, media_type: "image", bucket_id: "feed-media",
    storage_path: pendingPath, filename: "duplicate.png", mime_type: "image/png", bytes: 4,
  });
  check(Boolean(duplicateError), "duplicate attachment paths are rejected");

  const invalidMimePath = `${owner.id}/${runId}-invalid.txt`;
  const invalidMimeError = await upload(owner.client, owner.id, invalidMimePath, "text/plain", new Uint8Array([1, 2, 3]));
  check(Boolean(invalidMimeError), "invalid MIME uploads are rejected");

  const oversizedBytes = new Uint8Array(50 * 1024 * 1024 + 1);
  const oversizedPath = `${owner.id}/${runId}-oversized.bin`;
  const oversizedError = await upload(owner.client, owner.id, oversizedPath, "video/mp4", oversizedBytes);
  check(Boolean(oversizedError), "oversized uploads are rejected");

  const { error: invalidRowError } = await owner.client.from("feed_post_media").insert({
    post_id: pendingPost, owner_id: owner.id, media_type: "image", bucket_id: "feed-media",
    storage_path: pendingPath, filename: "too-large.png", mime_type: "image/png", bytes: 50 * 1024 * 1024 + 1,
  });
  check(Boolean(invalidRowError), "oversized attachment metadata is rejected");

  const publishedPost = await createPost(owner);
  const publishedPath = `${owner.id}/${runId}-published.png`;
  objects.push(publishedPath);
  check(!(await upload(owner.client, owner.id, publishedPath)), "owner can upload the published-test object");
  const { error: publishedRowError } = await admin.from("feed_post_media").insert({
    post_id: publishedPost, owner_id: owner.id, media_type: "image", bucket_id: "feed-media",
    storage_path: publishedPath, filename: "published.png", mime_type: "image/png", bytes: 4,
  });
  if (publishedRowError) throw publishedRowError;
  const { error: publishError } = await admin.from("feed_posts").update({ status: "published", moderation_status: "approved", published_at: new Date().toISOString() }).eq("id", publishedPost);
  if (publishError) throw publishError;
  const { data: publishedRows } = await anon().from("feed_post_media").select("id").eq("post_id", publishedPost);
  check(publishedRows?.length === 1, "published attachment metadata is publicly readable");

  const { data: signed, error: signedError } = await admin.storage.from("feed-media").createSignedUrl(publishedPath, 1);
  if (signedError) throw signedError;
  check(Boolean(signed?.signedUrl), "published attachment can receive a signed URL");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const expiredResponse = await fetch(signed.signedUrl);
  check(!expiredResponse.ok, "expired signed URLs cannot be reused");

  const publicPath = `${owner.id}/${runId}-public.txt`;
  const publicUploadError = await upload(owner.client, owner.id, publicPath, "text/plain", new Uint8Array([111, 107]), "media");
  if (publicUploadError) throw publicUploadError;
  const { data: publicUrl } = admin.storage.from("media").getPublicUrl(publicPath);
  const publicResponse = await fetch(publicUrl.publicUrl);
  check(publicResponse.ok, "existing public media bucket remains publicly readable");
  await owner.client.storage.from("media").remove([publicPath]);

  // A failed metadata insert must not be confused with successful cleanup.
  // The application cleanup path is separately covered by the Feed server
  // function; this verifies the staging harness can detect leftover objects.
  const failedPath = `${owner.id}/${runId}-failed.png`;
  objects.push(failedPath);
  check(!(await upload(owner.client, owner.id, failedPath)), "failed-upload cleanup fixture can be created");
  await removeObject(failedPath);
  const { error: removedError } = await admin.storage.from("feed-media").download(failedPath);
  check(Boolean(removedError), "failed-upload cleanup leaves no readable object");
}

try {
  await main();
  console.log("Feed-media staging acceptance completed.");
} finally {
  for (const path of objects) await removeObject(path).catch(() => undefined);
  if (users.length) await admin.from("user_roles").delete().in("user_id", users).catch(() => undefined);
  for (const id of posts) await admin.from("feed_posts").delete().eq("id", id).catch(() => undefined);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => undefined);
}

