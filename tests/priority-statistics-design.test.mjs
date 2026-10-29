import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("official statistics stay separate, source-backed, admin-gated and revision-audited", () => {
  const migration = read("supabase/migrations/20261029150000_official_statistics_management_review.sql");
  const home = read("src/routes/index.tsx");
  assert.match(migration, /statistics_dataset_revisions/);
  assert.match(migration, /require_statistics_admin/);
  assert.match(migration, /Published statistics observations are immutable/);
  assert.match(migration, /metric_type/);
  assert.match(home, /statistics_datasets/);
  assert.match(home, /pending verification/);
  assert.doesNotMatch(home, /latest\.fatalities/);
});

test("trending uses genuine windows and the lead-plus-ranked-row presentation", () => {
  const news = read("src/routes/news.index.tsx");
  assert.match(news, /trending_news/);
  assert.match(news, /24h.*7d.*month.*year/);
  assert.match(news, /TrendingNewsView/);
  assert.match(news, /secondary = ranked\.slice\(1, 7\)/);
});

test("alert images flow through public query and preview rendering", () => {
  const discovery = read("src/components/site/discovery-sections.tsx");
  const globalPreview = read("src/components/site/global-editorial-preview.tsx");
  assert.match(discovery, /alert\.image_url/);
  assert.match(discovery, /hazard_type, severity, image_url/);
  assert.match(globalPreview, /hazard_type, image_url/);
});

test("shared cross-content sections use one lead and two compact records", () => {
  const preview = read("src/components/site/global-editorial-preview.tsx");
  assert.match(preview, /ItemLink item=\{items\[0\]\}/);
  assert.match(preview, /items\.slice\(1, 3\)/);
});
