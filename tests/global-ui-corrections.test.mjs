import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

test("shared public media metadata keeps captions italic and credits upright without prefixes", async () => {
  const source = await fs.readFile("src/components/site/editorial-media-meta.tsx", "utf8");
  assert.match(source, /<em>\{cleanCaption\}<\/em>/);
  assert.match(source, /<span>\{cleanCredit\}<\/span>/);
  assert.doesNotMatch(source, /Credit:/);
  assert.match(source, /if \(!cleanCaption && !cleanCredit\) return null/);
});

test("public detail routes use the shared media and summary primitives", async () => {
  const files = [
    "src/routes/news.$slug.tsx",
    "src/routes/alerts.$alertId.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/campaigns.$slug.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
  ];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    assert.match(source, /EditorialMediaMeta/);
    assert.match(source, /EditorialSummary/);
    assert.doesNotMatch(source, /Credit: \{/);
  }
});

test("admin content listings use the shared responsive listing surface", async () => {
  const files = ["articles", "alerts", "reports", "campaigns", "infrastructure-issues"];
  for (const name of files) {
    const source = await fs.readFile(`src/routes/_authenticated/admin/${name}.tsx`, "utf8");
    assert.match(source, /AdminListingSurface/);
    assert.match(source, /image_url/);
  }
  const listing = await fs.readFile("src/components/admin/admin-listing-surface.tsx", "utf8");
  assert.match(listing, /odd:bg-background/);
  assert.match(listing, /lg:grid/);
});
