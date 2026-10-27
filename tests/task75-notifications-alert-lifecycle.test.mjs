import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("notification panel is responsive, dismissible and destination-aware", () => {
  const bell = read("src/components/site/notification-bell.tsx");
  assert.match(bell, /fixed inset-x-0 bottom-0 top-14/);
  assert.match(bell, /sm:absolute/);
  assert.match(bell, /Escape/);
  assert.match(bell, /pointerdown/);
  assert.match(bell, /markAllRead/);
  assert.match(bell, /\/alerts\//);
  assert.match(bell, /\/reports\//);
  assert.match(bell, /No longer available/);
});

test("notification read mutations remain recipient-scoped", () => {
  const hook = read("src/hooks/useNotifications.ts");
  assert.match(hook, /\.eq\("user_id", user!\.id\)/);
  assert.match(hook, /\.eq\("user_id", user\.id\)/);
  assert.match(hook, /notifications-unread-count/);
});

test("alert detail exposes lifecycle status without accident casualty fields", () => {
  const detail = read("src/routes/alerts.$alertId.tsx");
  assert.match(detail, /\.eq\("id", params\.alertId\)[\s\S]*?\.maybeSingle\(\)/);
  assert.match(detail, /Alert \/ Hazard/);
  assert.match(detail, /In Progress/);
  assert.match(detail, /Resolved/);
});

test("alert lifecycle migration audits and authorises status changes", () => {
  const migration = read("supabase/migrations/20261027120000_alert_lifecycle_notifications_overhaul.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.alert_status_history/);
  assert.match(migration, /previous_status/);
  assert.match(migration, /changed_by/);
  assert.match(migration, /has_min_role\(auth\.uid\(\), 'editor'\)/);
  assert.match(migration, /NEW\.status NOT IN \('active', 'in_progress', 'resolved'\)/);
});
