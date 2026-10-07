import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const profile = read("src/routes/u.$userId.tsx");
const dashboard = read("src/routes/_authenticated/dashboard.tsx");
const header = read("src/components/site/site-header.tsx");

test("public profiles select only intentional public fields", () => {
  assert.match(profile, /select\("id, username, display_name, county, avatar_url/);
  assert.doesNotMatch(profile, /profiles[\s\S]{0,120}select\("\*"\)/);
  assert.doesNotMatch(profile, /referral_code|notification_preferences|latitude|longitude|email/);
});

test("public content excludes private workflow states", () => {
  assert.match(profile, /from\("alerts"\)[\s\S]*eq\("status", "active"\)/);
  assert.match(profile, /from\("accident_reports"\)[\s\S]*eq\("status", "approved"\)/);
  assert.match(profile, /from\("news"\)[\s\S]*eq\("status", "published"\)/);
  assert.doesNotMatch(profile, /reviewed_by|Reports approved and edited/);
});

test("signed-in activity is owner-scoped and has bounded recent lists", () => {
  for (const table of ["alerts", "accident_reports", "news", "comments", "pages"]) {
    assert.match(dashboard, new RegExp(`from\\("${table}"\\)`));
  }
  assert.match(dashboard, /eq\("user_id", userId!\)/);
  assert.match(dashboard, /eq\("author_id", userId!\)/);
  assert.match(dashboard, /eq\("owner_id", userId!\)/);
  assert.match(dashboard, /\.limit\(20\)/);
  assert.match(dashboard, /count: "exact", head: true/);
});

test("activity preserves source-specific status vocabulary", () => {
  assert.match(dashboard, /r\.status === "approved"/);
  assert.match(dashboard, /r\.status === "rejected"/);
  assert.match(dashboard, /a\.status === "published"/);
  assert.match(dashboard, /a\.status === "pending_review"/);
  assert.match(dashboard, /Notification preferences/);
});

test("profile identity, role, reputation, and subscription remain distinct", () => {
  assert.match(profile, /primaryRoleLabel/);
  assert.match(profile, /levelForPoints/);
  assert.match(profile, /badgeForPoints/);
  assert.match(profile, /hasActiveSubscription/);
  assert.match(profile, /Subscribed member/);
  assert.match(header, /Verification &amp; subscriptions/);
});

test("signed-out users cannot reach My Activity through the authenticated route", () => {
  const authRoute = read("src/routes/_authenticated/route.tsx");
  assert.match(authRoute, /supabase\.auth\.getUser/);
  assert.match(authRoute, /to: "\/auth"/);
  assert.match(header, /to="\/dashboard"/);
});

test("Task 28 has no external retrieval or Task 25 dependency", () => {
  assert.doesNotMatch(profile, /SearXNG|searx|Task 25|agent/i);
  assert.doesNotMatch(dashboard, /SearXNG|searx|Task 25|agent/i);
});
