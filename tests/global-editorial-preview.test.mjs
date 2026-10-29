import assert from "node:assert/strict";
import test from "node:test";
import { buildPreviewCards, rankPreviewCategories } from "../src/lib/global-editorial-preview.ts";

const item = (id, category, rank) => ({
  id,
  title: id,
  href: "/" + id,
  categoryKey: category,
  destination: "news",
  recordedViewRank: rank,
});

test("global preview category ranking follows recorded view order, not hardcoded labels", () => {
  const ranked = [
    item("second", "Safety", 4),
    item("first", "Infrastructure", 0),
    item("third", "Safety", 5),
  ];
  assert.deepEqual(
    rankPreviewCategories(ranked).map((group) => group.label),
    ["Infrastructure", "Safety"],
  );
});

test("global preview cards are latest plus two eligible ranked categories", () => {
  const cards = buildPreviewCards(
    [
      item("latest-1", null, undefined),
      item("latest-2", null, undefined),
      item("latest-3", null, undefined),
    ],
    [
      item("rank-1", "Infrastructure", 0),
      item("rank-2", "Infrastructure", 1),
      item("rank-3", "Safety", 2),
    ],
    { latest: "Latest" },
  );
  assert.deepEqual(
    cards.map((card) => card.title),
    ["Latest", "Infrastructure", "Safety"],
  );
  assert.equal(cards[0].items.length, 3);
  assert.equal(cards[1].ranked, true);
});

test("sparse ranked data does not fabricate a second category", () => {
  const cards = buildPreviewCards([item("latest", null, undefined)], [item("only", "Safety", 0)], {
    latest: "Latest",
  });
  assert.equal(cards.length, 2);
  assert.equal(
    cards.some((card) => card.title === "Infrastructure"),
    false,
  );
});

test("all public editorial surfaces mount the shared bidirectional preview", async () => {
  const fs = await import("node:fs/promises");
  const files = [
    "src/routes/index.tsx",
    "src/routes/news.index.tsx",
    "src/routes/alerts.index.tsx",
    "src/routes/reports.index.tsx",
    "src/routes/campaigns.tsx",
    "src/routes/infrastructure-issues.index.tsx",
    "src/routes/news.$slug.tsx",
    "src/routes/alerts.$alertId.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/campaigns.$slug.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
  ];
  for (const file of files) assert.match(await fs.readFile(file, "utf8"), /GlobalEditorialPreview/);
});

test("shared discovery cards keep canonical destinations and the approved responsive hierarchy", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile("src/components/site/global-editorial-preview.tsx", "utf8");
  for (const href of [
    "`/news/${item.slug}`",
    "`/alerts/${item.id}`",
    "`/reports/${item.id}`",
    "`/campaigns/${item.slug}`",
    "`/infrastructure-issues/${item.id}`",
  ]) {
    assert.ok(source.includes(href), "missing canonical preview destination " + href);
  }
  assert.match(source, /BannerAd/);
  assert.doesNotMatch(source, /Keep exploring|More from Share Barabara/);
  assert.match(source, /statistics_datasets/);
  assert.match(source, /from\("videos"\)/);
  assert.match(source, /grid gap-4 md:grid-cols-3/);
  assert.match(source, /slice\(0, 3\)/);
  assert.match(source, /Math\.ceil\(cards\.length \/ 3\)/);
  assert.match(source, /excludeKeys/);
});

test("discovery supports every genuine public source and page-level composite exclusions", async () => {
  const fs = await import("node:fs/promises");
  const source = await fs.readFile("src/components/site/global-editorial-preview.tsx", "utf8");
  for (const destination of [
    "news",
    "alerts",
    "reports",
    "campaigns",
    "infrastructure",
    "statistics",
    "media",
  ]) {
    assert.match(
      source,
      new RegExp(`\\"${destination}\\"`),
      `missing discovery source ${destination}`,
    );
  }
  assert.match(source, /excludeKeys\.includes\(`\$\{item\.destination\}:\$\{item\.id\}`\)/);
  assert.match(source, /!used\.has\(`\$\{item\.destination\}:\$\{item\.id\}`\)/);
  for (const file of [
    "src/routes/news.$slug.tsx",
    "src/routes/alerts.$alertId.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/campaigns.$slug.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
  ]) {
    assert.match(
      await fs.readFile(file, "utf8"),
      /excludeKeys=/,
      `${file} lacks page-level exclusions`,
    );
  }
});

test("ranked trending backfills after exclusions without changing rank order", async () => {
  const { selectRankedUnique } = await import("../src/lib/trending.ts");
  const ranked = [{ id: "a" }, { id: "b" }, { id: "b" }, { id: "c" }, { id: "d" }];
  assert.deepEqual(selectRankedUnique(ranked, new Set(["a"]), 3), [
    { id: "b" },
    { id: "c" },
    { id: "d" },
  ]);
  assert.deepEqual(selectRankedUnique(ranked, new Set(["a", "b", "c", "d"]), 3), []);
});

test("trending navigation targets the dedicated filtered News collection", async () => {
  const fs = await import("node:fs/promises");
  const sidebar = await fs.readFile("src/components/site/article-detail-sidebar.tsx", "utf8");
  const news = await fs.readFile("src/routes/news.index.tsx", "utf8");
  assert.match(sidebar, /search=\{\{ sort: "trending" \}\}/);
  assert.match(news, /search\.sort === "trending"/);
  assert.match(news, /title="Trending News"/);
    assert.match(news, /TrendingNewsView/);
    assert.match(news, /Last 24 hours/);
});
