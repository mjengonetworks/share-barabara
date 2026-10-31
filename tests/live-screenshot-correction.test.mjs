import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Report and Alert media uses intrinsic sizing and scene headings", async () => {
  const [gallery, report, alert] = await Promise.all([
    read("src/components/site/attachment-gallery.tsx"),
    read("src/routes/reports.$reportId.tsx"),
    read("src/routes/alerts.$alertId.tsx"),
  ]);
  assert.match(gallery, /More photos and videos from the scene/);
  assert.match(gallery, /h-auto max-w-full/);
  assert.doesNotMatch(gallery, /aspect-video w-full rounded-lg border border-border object-cover/);
  for (const source of [report, alert]) {
    assert.match(source, /block h-auto max-w-full rounded-xl border/);
    assert.match(source, /mt-1\.5 flex flex-wrap items-center gap-1 text-sm/);
  }
});

test("incident sidebars use compact Article-style rows and roads use canonical pages", async () => {
  const [list, report, alert] = await Promise.all([
    read("src/components/site/compact-editorial-list.tsx"),
    read("src/routes/reports.$reportId.tsx"),
    read("src/routes/alerts.$alertId.tsx"),
  ]);
  assert.match(list, /size-16/);
  assert.match(list, /line-clamp-3/);
  assert.match(report, /to="\/roads\/\$slug" params=\{\{ slug: linkedRoad\.slug \}\}/);
  assert.match(alert, /to="\/roads\/\$slug" params=\{\{ slug: linkedRoad\.slug \}\}/);
});

test("banner placement failures fall back without retry storms", async () => {
  const banner = await read("src/components/site/banner-ad.tsx");
  assert.match(banner, /select\("\*"\)/);
  assert.doesNotMatch(banner, /\.in\("placement"/);
  assert.doesNotMatch(banner, /\.order\("priority"/);
  assert.match(banner, /retry: false/);
  assert.match(banner, /refetchOnWindowFocus: false/);
  assert.match(banner, /selectEligibleBannerAds\(placementSafeQuery\.data, placement\)/);
});

test("public incident sidebars read latest eligible canonical Feed posts", async () => {
  const sidebar = await read("src/components/site/editorial-sidebar.tsx");
  assert.match(sidebar, /from\("feed_posts"\)/);
  assert.match(sidebar, /status.*published/);
  assert.match(sidebar, /moderation_status.*approved/);
  assert.match(sidebar, /Latest Media &amp; Feed/);
});

test("road matching never creates a record and supports reviewed aliases", async () => {
  const roads = await read("src/lib/roads.ts");
  assert.match(roads, /select\("\*"\)/);
  assert.match(roads, /aliases/);
  assert.match(roads, /return match\?\.id/);
  assert.doesNotMatch(roads, /\.insert\(/);
});

test("Road Registry migration is additive and review-only", async () => {
  const migration = await read("supabase/migrations/20261030200000_canonical_road_registry_review.sql");
  assert.match(migration, /ADD COLUMN IF NOT EXISTS geometry JSONB/);
  assert.match(migration, /road_registry_history/);
  assert.match(migration, /external_geo_id/);
  assert.match(migration, /DROP CONSTRAINT IF EXISTS roads_name_key/);
  assert.match(migration, /geometry_source/);
});
