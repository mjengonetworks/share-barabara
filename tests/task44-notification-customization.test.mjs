import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("notification matching supports parent inclusion and subtype-only selection", async () => {
  const { taxonomySelectionMatches } = await import("../src/lib/notification-preferences.mjs");
  const rows = [
    { value: "theft", parent_value: null, active: true },
    { value: "vehicle_theft", parent_value: "theft", active: true },
    { value: "motorcycle_theft", parent_value: "theft", active: true },
    { value: "vandalism", parent_value: null, active: true },
    { value: "road_furniture_vandalism", parent_value: "vandalism", active: true },
  ];
  assert.equal(taxonomySelectionMatches(rows, "motorcycle_theft", ["theft"], []), true);
  assert.equal(taxonomySelectionMatches(rows, "vehicle_theft", ["motorcycle_theft"], []), false);
  assert.equal(taxonomySelectionMatches(rows, "motorcycle_theft", ["theft"], ["motorcycle_theft"]), false);
  assert.equal(taxonomySelectionMatches(rows, "vehicle_theft", [], ["theft"]), false);
});

test("alert matching requires active public content, a location, and enabled channels", async () => {
  const { matchesCustomAlertPreference } = await import("../src/lib/notification-preferences.mjs");
  const rows = [{ value: "theft", parent_value: null, active: true }, { value: "vehicle_theft", parent_value: "theft", active: true }];
  const preference = {
    alerts: true, in_app_enabled: true, browser_enabled: true, radius_enabled: true,
    radius_km: 20, latitude: -1.28, longitude: 36.82, hazard_types: ["theft"],
    excluded_hazard_types: ["vandalism"], severities: ["major"], county_filters: [], road_ids: [],
  };
  const alert = { status: "active", latitude: -1.29, longitude: 36.82, hazard_type: "vehicle_theft", severity: "major" };
  assert.equal(matchesCustomAlertPreference(alert, preference, rows), true);
  assert.equal(matchesCustomAlertPreference({ ...alert, latitude: null }, preference, rows), false);
  assert.equal(matchesCustomAlertPreference({ ...alert, status: "draft" }, preference, rows), false);
  assert.equal(matchesCustomAlertPreference(alert, { ...preference, browser_enabled: false }, rows, { channel: "browser" }), false);
  assert.equal(matchesCustomAlertPreference(alert, { ...preference, mute_until: "2099-01-01T00:00:00Z" }, rows), false);
});

test("taxonomy restrictions do not turn missing category into a match", async () => {
  const { matchesCustomAlertPreference } = await import("../src/lib/notification-preferences.mjs");
  const preference = { alerts: true, in_app_enabled: true, radius_enabled: false, county_filters: ["Nairobi"], road_ids: [], hazard_types: ["theft"], excluded_hazard_types: [] };
  const alert = { status: "active", county: "Nairobi", hazard_type: null };
  assert.equal(matchesCustomAlertPreference(alert, preference, []), false);
  assert.equal(matchesCustomAlertPreference({ ...alert, hazard_type: "theft" }, { ...preference, severities: ["critical"] }, []), false);
});

test("notification groups and channels remain extensible without fake delivery", () => {
  const helper = read("src/lib/notification-preferences.mjs");
  const route = read("src/routes/notifications.tsx");
  const hook = read("src/hooks/useNotifications.ts");
  assert.match(helper, /NOTIFICATION_EVENT_GROUPS = \["alerts", "community", "account"\]/);
  assert.match(route, /Community activity/);
  assert.match(route, /Account activity/);
  assert.match(route, /Not available yet; no email provider/);
  assert.match(route, /no service-worker push delivery/);
  assert.match(hook, /browser_enabled/);
});

test("review migration adds owner-scoped controls and conservative defaults", () => {
  const sql = read("supabase/migrations/20260930160000_notification_customization_review.sql");
  assert.match(sql, /notifications_enabled boolean/);
  assert.match(sql, /excluded_hazard_types text\[\]/);
  assert.match(sql, /ARRAY\['theft', 'vandalism'\]/);
  assert.match(sql, /notification_hazard_type_matches/);
  assert.match(sql, /ON CONFLICT \(user_id, dedupe_key\)/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /Do not execute/i);
  assert.doesNotMatch(sql, /service_role.*browser/i);
});

test("private coordinates stay owner-scoped and alert delivery excludes inactive content", () => {
  const sql = read("supabase/migrations/20260930160000_notification_customization_review.sql");
  assert.match(sql, /notification_preferences/);
  assert.match(sql, /NEW\.status <> 'active'/);
  assert.match(sql, /user_id <> NEW\.user_id/);
  assert.match(sql, /radius_enabled/);
  assert.match(sql, /NEW\.latitude IS NOT NULL/);
});

test("future feed event families are not fabricated or routed through SearXNG", () => {
  const route = read("src/routes/notifications.tsx");
  const migration = read("supabase/migrations/20260930160000_notification_customization_review.sql");
  assert.doesNotMatch(route, /mentions|followed conversations|moderation event/i);
  assert.doesNotMatch(migration, /searxng|agent/i);
  assert.doesNotMatch(route, /email.*sent|sendEmail|push subscription/i);
});
