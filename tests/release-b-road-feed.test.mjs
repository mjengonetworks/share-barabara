import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Road Registry review migration is additive and protects canonical merges", async () => {
  const sql = await read("supabase/migrations/20261030200000_canonical_road_registry_review.sql");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS geometry JSONB/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS merged_into_id UUID/);
  assert.match(sql, /road_registry_history/);
  assert.match(sql, /merge_road_registry_records/);
  assert.match(sql, /has_min_role\(auth\.uid\(\), 'admin'\)/);
  assert.match(sql, /UPDATE public\.accident_reports SET road_id/);
  assert.match(sql, /UPDATE public\.infrastructure_issues SET road_id/);
  assert.doesNotMatch(sql, /DROP TABLE\s+public\.roads/i);
});

test("Road Registry RLS hardening removes unrestricted authenticated inserts", async () => {
  const sql = await read("supabase/migrations/20261030220000_canonical_road_registry_rls_hardening_review.sql");
  assert.match(sql, /DROP POLICY IF EXISTS roads_insert_authenticated/);
  assert.match(sql, /CREATE POLICY roads_insert_editor/);
  assert.match(sql, /has_min_role\(auth\.uid\(\), 'editor'\)/);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.roads FROM anon/);
  assert.match(sql, /CREATE POLICY roads_public_read_eligible/);
  assert.match(sql, /merged_into_id IS NULL/);
  assert.match(sql, /merge_road_registry_records/);
  assert.doesNotMatch(sql, /WITH CHECK \(true\)/i);
});

test("automatic Feed bridge is idempotent and preserves community posts", async () => {
  const sql = await read("supabase/migrations/20261030210000_editorial_feed_sources_review.sql");
  assert.match(sql, /editorial_feed_entries/);
  assert.match(sql, /UNIQUE \(source_type, source_id\)/);
  assert.match(sql, /ON CONFLICT \(source_type, source_id\) DO UPDATE/);
  assert.match(sql, /report_published/);
  assert.match(sql, /feed_posts/);
  assert.match(sql, /source_id::TEXT/);
  assert.doesNotMatch(sql, /TRUNCATE|DROP TABLE/i);
});

test("Road Registry admin route is present and role-gated", async () => {
  const route = await read("src/routes/_authenticated/admin/roads.tsx");
  const nav = await read("src/routes/_authenticated/admin/route.tsx");
  assert.match(route, /createFileRoute\("\/_authenticated\/admin\/roads"\)/);
  assert.match(route, /ROLE_RANK\.editor/);
  assert.match(route, /geometry_source/);
  assert.match(route, /Save reviewed road data/);
  assert.match(nav, /\/admin\/roads/);
});
