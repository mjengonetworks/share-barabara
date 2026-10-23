import assert from "node:assert/strict";
import test from "node:test";

import { groupLatestByEntity } from "../src/lib/category-entity.ts";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("main category browsing creates one card per distinct entity with newest records first", () => {
  const records = [
    { id: "a-old", category: "Awareness", published_at: "2026-01-01" },
    { id: "b-new", category: "Infrastructure", published_at: "2026-03-01" },
    { id: "a-new", category: "Awareness", published_at: "2026-04-01" },
    { id: "c-new", category: "Campaigns", published_at: "2026-05-01" },
    { id: "b-old", category: "Infrastructure", published_at: "2026-02-01" },
    { id: "a-mid", category: "Awareness", published_at: "2026-02-01" },
  ];

  const groups = groupLatestByEntity(records);
  assert.deepEqual(groups.slice(0, 3).map((group) => group.entity), [
    "Awareness",
    "Infrastructure",
    "Campaigns",
  ]);
  assert.deepEqual(groups[0].items.map((item) => item.id), ["a-new", "a-mid", "a-old"]);
  assert.deepEqual(groups[1].items.map((item) => item.id), ["b-new", "b-old"]);
  assert.ok(groups.every((group) => new Set(group.items.map((item) => item.category)).size === 1));
});

test("news listing uses the shared entity-card grid and canonical category destinations", async () => {
  const news = await read("src/routes/news.index.tsx");
  const layout = await read("src/components/site/public-layout.tsx");
  assert.match(news, /groupLatestByEntity/);
  assert.match(news, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(news, /news\?category=\$\{encodeURIComponent\(entity\)\}/);
  assert.match(layout, /One CMS category\/entity card/);
  assert.match(layout, /articles\.slice\(0, 3\)/);
  assert.match(layout, /View more/);
  assert.doesNotMatch(news, /titles=\["Lead story", "Latest in this topic", "More from this topic"\]/);
});

test("entity cards adapt from three columns to one column without fixed-width overflow", async () => {
  const layout = await read("src/components/site/public-layout.tsx");
  assert.match(layout, /min-w-0 flex-col rounded-xl/);
  assert.match(layout, /w-full object-cover/);
  assert.match((await read("src/routes/news.index.tsx")), /grid gap-5 sm:grid-cols-2 lg:grid-cols-3/);
});

test("incident entity grouping supports type-specific entities and publication dates", () => {
  const records = [
    { id: "r-old", incident_type: "Collision", created_at: "2026-01-01" },
    { id: "r-new", incident_type: "Collision", created_at: "2026-04-01" },
    { id: "a-new", hazard_type: "Flooding", occurred_at: "2026-05-01" },
  ];
  const groups = groupLatestByEntity(
    records,
    (item) => item.incident_type ?? item.hazard_type,
    (item) => item.created_at ?? item.occurred_at,
  );
  assert.deepEqual(groups.map((group) => group.entity), ["Collision", "Flooding"]);
  assert.deepEqual(groups[0].items.map((item) => item.id), ["r-new", "r-old"]);
});
