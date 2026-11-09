import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("generic advertising creatives fall back to the canonical advertising CTA", async () => {
  const [ads, selector] = await Promise.all([
    read("src/components/site/banner-ad.tsx"),
    read("src/lib/banner-ads.ts"),
  ]);
  assert.match(ads, /Your ad here/);
  assert.match(ads, /Advertise with us/);
  assert.match(ads, /to="\/partner-with-us"/);
  assert.match(selector, /book your roadworthiness test/);
  assert.match(selector, /emergency response, 24\/7/);
  assert.match(selector, /isGenericHouseCreative/);
});

test("accident taxonomy separates stable severity and incident-type identities", async () => {
  const source = await read("src/routes/index.tsx");
  assert.match(source, /seenSeverities/);
  assert.match(source, /seenIncidents/);
  assert.match(source, /Severity ·/);
  assert.match(source, /Incident type ·/);
});

test("road discovery reuses verified roads and honestly withholds unavailable rankings", async () => {
  const [component, directory, alerts, reports, statistics, index] = await Promise.all([
    read("src/components/site/road-discovery.tsx"),
    read("src/routes/roads.index.tsx"),
    read("src/routes/alerts.index.tsx"),
    read("src/routes/reports.index.tsx"),
    read("src/routes/statistics.tsx"),
    read("src/routes/index.tsx"),
  ]);
  assert.match(component, /from\("roads"\)/);
  assert.match(component, /order\("created_at", \{ ascending: false \}\)/);
  assert.match(component, /Most viewed roads in the last 24 hours will appear when genuine/);
  assert.match(index, /RoadFilterLinks kind="news"/);
  assert.match(directory, /createFileRoute\("\/roads\/"\)/);
  assert.match(alerts, /RoadFilterLinks kind="alerts"/);
  assert.match(reports, /RoadFilterLinks kind="reports"/);
  assert.match(statistics, /RoadDiscovery compact/);
});
