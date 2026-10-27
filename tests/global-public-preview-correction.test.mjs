import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("shared public preview cards contain no summary or teaser paragraphs", () => {
  const layout = read("src/components/site/public-layout.tsx");
  const discovery = read("src/components/site/discovery-sections.tsx");
  const preview = read("src/components/site/global-editorial-preview.tsx");
  assert.doesNotMatch(layout, /article\.summary\s*\?\s*\(/);
  assert.doesNotMatch(discovery, /article\.summary\}/);
  assert.doesNotMatch(discovery, /alert\.description\}/);
  assert.doesNotMatch(discovery, /issue\.summary\}/);
  assert.doesNotMatch(discovery, /campaign\.description\}/);
  assert.doesNotMatch(preview, /item\.summary/);
  assert.doesNotMatch(preview, /card\.description/);
});

test("News keeps detail summaries but uses image-led latest updates and primary-first ordering", () => {
  const news = read("src/routes/news.index.tsx");
  const detail = read("src/routes/news.$slug.tsx");
  assert.match(news, /function LatestStrip/);
  assert.match(news, /Latest updates/);
  assert.match(news, /article\.image_url/);
  assert.match(news, /CategoryEntityGrid/);
  assert.match(
    news,
    /!category && sort !== "trending" \? <LatestStrip articles=\{latest\} \/> : null/,
  );
  assert.match(news, /sort === "trending"/);
  assert.match(news, /TrendingCollection/);
  assert.match(detail, /article\.summary\?\.trim\(\)/);
});

test("global discovery keeps the three-card desktop and complete-card mobile contract", () => {
  const preview = read("src/components/site/global-editorial-preview.tsx");
  assert.match(preview, /grid gap-4 md:grid-cols-3/);
  assert.match(preview, /slice\(1, 3\)/);
  assert.match(preview, /slice\(0, 3\)/);
  assert.match(preview, /BannerAd/);
  assert.doesNotMatch(preview, /Keep exploring|More from Share Barabara/);
  assert.match(preview, /Math\.ceil\(cards\.length \/ 3\)/);
  assert.match(preview, /excludeKeys/);
});

test("primary public surfaces keep their own content before global discovery", () => {
  for (const [file, own, discovery] of [
    ["src/routes/news.index.tsx", 'title="Browse by Category"', "GlobalEditorialPreview"],
    ["src/routes/alerts.index.tsx", "Latest Alerts", "GlobalEditorialPreview"],
    ["src/routes/reports.index.tsx", "Latest Accident Reports", "GlobalEditorialPreview"],
    ["src/routes/campaigns.tsx", "Ongoing campaigns", "GlobalEditorialPreview"],
    [
      "src/routes/infrastructure-issues.index.tsx",
      "Infrastructure issues",
      "GlobalEditorialPreview",
    ],
  ]) {
    const source = read(file);
    assert.ok(
      source.indexOf(own) < source.lastIndexOf(discovery),
      `${file} places discovery before primary content`,
    );
  }
});
