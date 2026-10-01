import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { distanceKm, isPublicActiveAlert, matchesAlertPreference, notificationDedupeKey } from "../src/lib/alert-notification.mjs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260930110000_alert_notification_preferences_review.sql", import.meta.url),
  "utf8",
);

const baseAlert = {
  id: "alert-1",
  status: "active",
  latitude: -1.286389,
  longitude: 36.817223,
  county: "Nairobi",
  road_id: "road-1",
  hazard_type: "pothole",
  severity: "high",
};

test("distance uses kilometres and distinguishes inside from outside", () => {
  const origin = { latitude: -1.286389, longitude: 36.817223 };
  assert.ok(distanceKm(origin, { latitude: -1.286389, longitude: 36.827223 }) > 1);
  assert.ok(distanceKm(origin, { latitude: -1.286389, longitude: 36.827223 }) < 2);
  assert.equal(matchesAlertPreference(baseAlert, {
    alerts: true, radius_enabled: true, radius_km: 5, latitude: -1.286389, longitude: 36.817223,
  }), true);
  assert.equal(matchesAlertPreference({ ...baseAlert, latitude: -1.5 }, {
    alerts: true, radius_enabled: true, radius_km: 5, latitude: -1.286389, longitude: 36.817223,
  }), false);
});

test("missing coordinates never broaden a radius subscription", () => {
  const preference = { alerts: true, radius_enabled: true, radius_km: 20, latitude: -1.2, longitude: 36.8 };
  assert.equal(matchesAlertPreference({ ...baseAlert, latitude: null, longitude: null }, preference), false);
  assert.equal(matchesAlertPreference(baseAlert, { ...preference, latitude: null, longitude: null }), false);
});

test("county and road are explicit geographic alternatives", () => {
  assert.equal(matchesAlertPreference(baseAlert, { alerts: true, county_filters: ["Nairobi"] }), true);
  assert.equal(matchesAlertPreference(baseAlert, { alerts: true, road_ids: ["road-1"] }), true);
  assert.equal(matchesAlertPreference(baseAlert, { alerts: true, county_filters: ["Mombasa"] }), false);
});

test("content filters are additional AND constraints", () => {
  const preference = {
    alerts: true, county_filters: ["Nairobi"], hazard_types: ["pothole"], severities: ["high"],
  };
  assert.equal(matchesAlertPreference(baseAlert, preference), true);
  assert.equal(matchesAlertPreference({ ...baseAlert, severity: "low" }, preference), false);
  assert.equal(matchesAlertPreference({ ...baseAlert, hazard_type: "flood" }, preference), false);
});

test("inactive alerts, disabled master switch, and mute do not match", () => {
  const preference = { alerts: true, county_filters: ["Nairobi"] };
  assert.equal(isPublicActiveAlert({ ...baseAlert, status: "draft" }), false);
  assert.equal(matchesAlertPreference({ ...baseAlert, status: "draft" }, preference), false);
  assert.equal(matchesAlertPreference(baseAlert, { ...preference, alerts: false }), false);
  assert.equal(matchesAlertPreference(baseAlert, {
    ...preference, mute_until: "2099-01-01T00:00:00.000Z",
  }), false);
});

test("one deterministic key deduplicates all matching dimensions", () => {
  assert.equal(notificationDedupeKey("alert-1"), "alert:alert-1:nearby");
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_dedupe_key_idx/);
  assert.match(migration, /ON CONFLICT \(user_id, dedupe_key\)/);
});

test("review migration enforces private preferences and active-alert delivery", () => {
  assert.match(migration, /FOR SELECT TO authenticated/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /radius_enabled boolean NOT NULL DEFAULT false/);
  assert.match(migration, /CHECK \(radius_km BETWEEN 1 AND 500\)/);
  assert.match(migration, /IF NEW\.status <> 'active'/);
  assert.match(migration, /in_app_enabled = true/);
  assert.doesNotMatch(migration, /GRANT .* TO anon/);
  assert.doesNotMatch(migration, /searx|task 25|agent/i);
});

test("review migration does not depend on an unexecuted schema from the live UI", () => {
  const route = fs.readFileSync(new URL("../src/routes/notifications.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(route, /radius_enabled|county_filters|road_ids|hazard_types|severities|mute_until/);
  assert.match(route, /notification_preferences/);
});
