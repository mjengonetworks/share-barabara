import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("review migration creates owner-scoped subscriptions and an idempotent outbox", () => {
  const sql = read("supabase/migrations/20260930170000_push_delivery_reliability_review.sql");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.push_subscriptions/);
  assert.match(sql, /UNIQUE \(endpoint\)/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /notification_delivery_jobs/);
  assert.match(sql, /UNIQUE \(notification_id, channel\)/);
  assert.match(sql, /AFTER INSERT ON public\.notifications/);
  assert.match(sql, /ON CONFLICT \(notification_id, channel\) DO NOTHING/);
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /claim_notification_delivery_jobs/);
  assert.match(sql, /attempt_number integer NOT NULL/);
  assert.match(sql, /locked_at <= now\(\) - interval '5 minutes'/);
  assert.match(sql, /Do not execute/i);
});

test("service worker handles safe push payloads and internal notification clicks", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /showNotification/);
  assert.match(worker, /notificationclick/);
  assert.match(worker, /parsed\.origin === self\.location\.origin/);
  assert.doesNotMatch(worker, /VAPID_PRIVATE|SUPABASE_SERVICE_ROLE|secret/i);
});

test("browser registration stores only subscription material and supports multiple devices", () => {
  const client = read("src/lib/web-push.ts");
  assert.match(client, /VITE_WEB_PUSH_ENABLED/);
  assert.match(client, /applicationServerKey/);
  assert.match(client, /push_subscriptions/);
  assert.match(client, /endpoint/);
  assert.match(client, /p256dh/);
  assert.match(client, /auth/);
  assert.match(client, /removeWebPushSubscription/);
  assert.doesNotMatch(client, /VAPID_PRIVATE|SUPABASE_SERVICE_ROLE/);
});

test("dispatcher is server-only, preference-aware, retry-bounded, and rejects private endpoints", () => {
  const dispatcher = read("src/lib/push-dispatcher.server.ts");
  const crypto = read("src/lib/push-dispatch.server.ts");
  assert.match(dispatcher, /supabaseAdmin/);
  assert.match(dispatcher, /push_enabled/);
  assert.match(dispatcher, /matchesCustomAlertPreference/);
  assert.match(dispatcher, /MAX_ATTEMPTS = 8/);
  assert.match(crypto, /WEB_PUSH_VAPID_PRIVATE_KEY/);
  assert.match(crypto, /rejectPrivateEndpoint/);
  assert.match(crypto, /Private push endpoint rejected/);
  assert.match(crypto, /AES-GCM/);
  assert.match(crypto, /ECDH/);
  assert.match(crypto, /Content-Encoding: auth/);
  assert.doesNotMatch(crypto, /VITE_WEB_PUSH_VAPID_PRIVATE/);
});

test("foreground delivery has a bounded refresh fallback and deduplicates realtime events", () => {
  const hook = read("src/hooks/useNotifications.ts");
  assert.match(hook, /refetchInterval: 60_000/);
  assert.match(hook, /seenRealtimeIds/);
  assert.match(hook, /notifications_enabled,browser_enabled/);
  assert.match(hook, /postgres_changes/);
  assert.match(hook, /removeChannel/);
});

test("scheduled dispatch and admin diagnostics are configuration and role gated", () => {
  const server = read("src/server.ts");
  const wrangler = read("wrangler.jsonc");
  const admin = read("src/routes/_authenticated/admin/notification-health.tsx");
  assert.match(server, /WEB_PUSH_ENABLED/);
  assert.match(server, /dispatchPendingPushJobs/);
  assert.match(wrangler, /crons/);
  assert.match(server, /claim_notification_delivery_jobs|dispatchPendingPushJobs/);
  assert.match(admin, /ROLE_RANK\.admin/);
  assert.match(admin, /notification_delivery_jobs/);
  assert.match(admin, /push_subscriptions/);
  assert.doesNotMatch(admin, /select\("[^\"]*(endpoint|p256dh|auth)[^\"]*"\)/);
});

test("runtime contract covers ownership, retries, invalid endpoints, and secret-safe configuration", () => {
  const client = read("src/lib/web-push.ts");
  const dispatcher = read("src/lib/push-dispatcher.server.ts");
  const docs = read("docs/task47-push-delivery.md");
  assert.match(client, /\.eq\("user_id", userId\)/);
  assert.match(client, /onConflict: "endpoint"/);
  assert.match(client, /\.delete\(\)\.eq\("user_id", userId\)/);
  assert.match(dispatcher, /status: "retrying"/);
  assert.match(dispatcher, /status: result\.permanent \? "invalid" : "active"/);
  assert.match(dispatcher, /upsert\(/);
  assert.match(dispatcher, /attempt_number: job\.attempts/);
  assert.match(docs, /WEB_PUSH_VAPID_PRIVATE_KEY/);
  assert.match(docs, /VITE_WEB_PUSH_PUBLIC_KEY/);
  assert.doesNotMatch(docs, /[A-Za-z0-9_-]{40,}/);
});

test("Task 47 does not add email, SearXNG, or Task 25 execution", () => {
  const files = [
    "src/lib/push-dispatch.server.ts", "src/lib/push-dispatcher.server.ts",
    "src/lib/web-push.ts", "public/sw.js", "src/server.ts",
  ].map(read).join("\n");
  assert.doesNotMatch(files, /sendEmail|email provider|SearXNG/i);
  assert.doesNotMatch(files, /Task 25 agent|runAgent|agent\.execute/i);
});
