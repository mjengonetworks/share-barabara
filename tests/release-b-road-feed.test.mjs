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
  assert.match(sql, /canonical_accident_statistics/);
  assert.match(sql, /TG_OP = 'INSERT'/);
  assert.match(sql, /TG_OP = 'UPDATE'/);
  assert.match(sql, /TG_OP = 'DELETE'/);
  assert.doesNotMatch(sql, /DROP TABLE\s+public\.roads/i);
});

test("canonical road matching searches reviewed aliases and fails closed on ambiguity", async () => {
  const source = await read("src/lib/roads.ts");
  assert.match(source, /contains\("aliases", \[trimmed\]\)/);
  assert.match(source, /county_context/);
  assert.match(source, /exact\.length === 1/);
  assert.match(source, /findExistingRoad\(name: string, county\?: string \| null\)/);
});

test("Road Registry RLS hardening removes unrestricted authenticated inserts", async () => {
  const sql = await read("supabase/migrations/20261030220000_canonical_road_registry_rls_hardening_review.sql");
  assert.match(sql, /DROP POLICY IF EXISTS roads_insert_authenticated/);
  assert.match(sql, /DROP POLICY IF EXISTS roads_insert_editor/);
  assert.match(sql, /CREATE POLICY roads_insert_editor/);
  assert.match(sql, /has_min_role\(auth\.uid\(\), 'editor'\)/);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.roads FROM anon/);
  assert.match(sql, /CREATE POLICY roads_public_read_eligible/);
  assert.match(sql, /DROP POLICY IF EXISTS roads_public_read_eligible/);
  assert.match(sql, /merged_into_id IS NULL/);
  assert.match(sql, /merge_road_registry_records/);
  assert.doesNotMatch(sql, /WITH CHECK \(true\)/i);
  assert.equal((sql.match(/DROP POLICY IF EXISTS roads_update_editor/g) ?? []).length, 1);
});

test("automatic Feed bridge is idempotent and preserves community posts", async () => {
  const sql = await read("supabase/migrations/20261030210000_editorial_feed_sources_review.sql");
  assert.match(sql, /editorial_feed_entries/);
  assert.match(sql, /UNIQUE \(source_type, source_id\)/);
  assert.match(sql, /ON CONFLICT \(source_type, source_id\) DO UPDATE/);
  assert.match(sql, /report_published/);
  assert.match(sql, /feed_posts/);
  assert.match(sql, /source_id::TEXT/);
  assert.match(sql, /TG_OP = 'INSERT'/);
  assert.match(sql, /TG_OP = 'UPDATE'/);
  assert.match(sql, /TG_OP = 'DELETE'/);
  assert.match(sql, /editorial_feed_infrastructure_sync/);
  assert.match(sql, /end_date.*CURRENT_DATE/s);
  assert.doesNotMatch(sql, /TRUNCATE|DROP TABLE/i);
});

test("atomic SQL Editor artifact preserves all three migrations and final postconditions", async () => {
  const sql = await read("docs/release-b/release-b-atomic-sql-editor.sql");
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
  assert.match(sql, /does not write supabase_migrations.schema_migrations/);
  for (const trigger of [
    "editorial_feed_article_sync",
    "editorial_feed_report_sync",
    "editorial_feed_alert_sync",
    "editorial_feed_infrastructure_sync",
    "editorial_feed_campaign_sync",
  ]) assert.match(sql, new RegExp(trigger));
  assert.match(sql, /roads_insert_authenticated remains/);
  assert.match(sql, /unexpected roads policy remains/);
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
