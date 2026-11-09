import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage taxonomy uses one non-wrapping horizontal strip with accessible overflow", async () => {
  const source = await read("src/components/site/taxonomy-strip.tsx");
  assert.match(source, /Browse|heading/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /whitespace-nowrap/);
  assert.match(source, /role="list"/);
  assert.match(source, /focus-visible:ring/);
});

test("homepage category discovery is separated from the three article preview rows", async () => {
  const source = await read("src/routes/index.tsx");
  assert.match(source, /Browse articles by category/);
  assert.doesNotMatch(source, /categories=\{news\.map\(\(article\) => article\.category/);
  assert.match(source, /home-published-taxonomy/);
  assert.match(source, /homepageTaxonomy\.news/);
  assert.match(source, /homepageTaxonomy\.alerts/);
  assert.match(source, /homepageTaxonomy\.reports/);
  assert.match(source, /homepageTaxonomy\.infrastructure/);
});

test("homepage taxonomy links preserve canonical filtered destinations", async () => {
  const source = await read("src/routes/index.tsx");
  assert.match(source, /to: "\/news"[\s\S]*search: \{ category/);
  assert.match(source, /to: "\/alerts"[\s\S]*search: \{ hazard/);
  assert.match(source, /to: "\/reports"[\s\S]*search: \{ severity/);
  assert.match(source, /to: "\/reports"[\s\S]*search: \{ incident/);
  assert.match(source, /to: "\/infrastructure-issues"[\s\S]*search: \{ structure/);
});
