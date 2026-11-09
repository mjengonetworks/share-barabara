import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("homepage most viewed uses all three genuine 12-hour RPC rankings", () => {
  const source = read("src/components/site/homepage-most-viewed.tsx");
  assert.match(source, /Most Viewed — Last 12 Hours/);
  assert.match(source, /trending_alerts|fetchMostViewed\(card\.tab, 12/);
  assert.match(source, /Most Viewed Alerts/);
  assert.match(source, /Most Viewed Articles/);
  assert.match(source, /Most Viewed Accident Reports/);
  assert.match(source, /md:grid-cols-3/);
});

test("trending route exposes requested tabs, windows, taxonomy and canonical ranking links", () => {
  const source = read("src/routes/trending.tsx");
  for (const marker of [
    "Alerts",
    "Articles",
    "Accident Reports",
    "Last 12 Hours",
    "Last 24 Hours",
    "Past 7 Days",
    "Past Month",
    "Past Year",
  ]) {
    assert.match(source, new RegExp(marker));
  }
  assert.match(source, /fetchMostViewedTaxonomy/);
  assert.match(source, /to=\{rows\[0\]\.href\}/);
  assert.match(source, /\{index \+ 2\}/);
});

test("rolling ranking adapter preserves real status filters and does not fabricate data", () => {
  const source = read("src/lib/most-viewed.ts");
  assert.match(source, /hours_back/);
  assert.match(source, /status.*active/);
  assert.match(source, /status.*published/);
  assert.match(source, /status.*approved/);
  assert.doesNotMatch(source, /synthetic|Math\.random|fake/i);
});
