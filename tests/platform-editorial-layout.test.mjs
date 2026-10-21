import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("detail routes consume the shared editorial sidebar", async () => {
  const routes = await Promise.all([
    read("src/routes/alerts.$alertId.tsx"),
    read("src/routes/reports.$reportId.tsx"),
    read("src/routes/campaigns.$slug.tsx"),
    read("src/routes/infrastructure-issues.$issueId.tsx"),
  ]);
  for (const route of routes) {
    assert.match(route, /EditorialSidebar/);
  }
});

test("ecosystem previews use the approved full descriptions and no legacy slogan", async () => {
  const discovery = await read("src/components/site/discovery-sections.tsx");
  assert.match(discovery, /Construction news, industry insights, project tracking and documentation from Kenya and beyond\./);
  assert.match(discovery, /Find rated fundis, contractors, consultants and other professionals and service providers/);
  assert.doesNotMatch(discovery, /Across our ecosystem/);
});

test("shared detail shell keeps natural 70/30 responsive columns", async () => {
  const layout = await read("src/components/site/public-layout.tsx");
  assert.match(layout, /max-w-\[1500px\]/);
  assert.match(layout, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,30%\)\]/);
  assert.match(layout, /min-w-0 rounded-xl/);
});
