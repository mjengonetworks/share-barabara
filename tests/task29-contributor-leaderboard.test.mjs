import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { deterministicLeaderboardOrder, earnedContributorScore } from "../src/lib/contributor-leaderboard.mjs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260930120000_contributor_leaderboard_review.sql", import.meta.url),
  "utf8",
);
const route = fs.readFileSync(new URL("../src/routes/contributors.tsx", import.meta.url), "utf8");
const hook = fs.readFileSync(new URL("../src/hooks/useContributorLeaderboard.ts", import.meta.url), "utf8");

test("leaderboard score uses the existing earned metric", () => {
  assert.equal(earnedContributorScore(17, 5), 22);
  assert.match(migration, /net votes.*referral_points/s);
  assert.match(migration, /SUM\(votes\.value\)/);
  assert.match(migration, /COALESCE\(profiles\.referral_points, 0\)/);
});

test("paid subscription, role, and verification are absent from ranking", () => {
  assert.doesNotMatch(migration, /subscriptions|user_roles|verified/);
  assert.doesNotMatch(route, /from\("subscriptions"\)|from\("user_roles"\)|\.verified/);
});

test("ties have a stable score rank and deterministic display order", () => {
  const ordered = deterministicLeaderboardOrder([
    { user_id: "b", score: 10 },
    { user_id: "a", score: 10 },
    { user_id: "c", score: 4 },
  ]);
  assert.deepEqual(ordered.map((row) => row.user_id), ["a", "b", "c"]);
  assert.match(migration, /DENSE_RANK\(\) OVER \(ORDER BY score_rows\.score DESC\)/);
  assert.match(migration, /ORDER BY ranked\.score DESC, ranked\.user_id ASC/);
});

test("leaderboard returns explicit public fields and excludes suspended profiles", () => {
  assert.match(migration, /RETURNS TABLE \([\s\S]*username text,[\s\S]*avatar_url text/);
  assert.doesNotMatch(migration, /email|notification_preferences|latitude|longitude|referral_code/i);
  assert.match(migration, /COALESCE\(profiles\.suspended, false\) = false/);
  assert.match(migration, /SECURITY DEFINER[\s\S]*SET search_path = public/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_contributor_leaderboard[\s\S]*anon, authenticated/);
});

test("public contribution metadata uses public statuses, not private workflow rows", () => {
  assert.match(migration, /news\.status = 'published'/);
  assert.match(migration, /accident_reports\.status = 'approved'/);
  assert.match(migration, /alerts\.status = 'active'/);
});

test("all-time only is explicit and database pagination is bounded", () => {
  assert.match(route, /All-time only/);
  assert.match(migration, /LIMIT LEAST\(GREATEST\(COALESCE\(_limit, 25\), 1\), 100\)/);
  assert.match(route, /PAGE_SIZE = 25/);
  assert.match(hook, /get_contributor_leaderboard/);
});

test("signed-in position is optional and does not require loading the full leaderboard", () => {
  assert.match(route, /Your position/);
  assert.match(hook, /_user_id/);
  assert.match(route, /enabled: !!user/);
  assert.match(migration, /WHERE \(_user_id IS NULL OR ranked\.user_id = _user_id\)/);
});

test("no external retrieval or Task 25 dependency exists", () => {
  assert.doesNotMatch(route, /SearXNG|searx|Task 25|agent/i);
  assert.doesNotMatch(migration, /SearXNG|searx|Task 25|agent/i);
});
