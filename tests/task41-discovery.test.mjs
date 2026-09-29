import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const discovery = await readFile("src/components/site/discovery-sections.tsx", "utf8");
const home = await readFile("src/routes/index.tsx", "utf8");
const banner = await readFile("src/components/site/banner-ad.tsx", "utf8");
const pending = await readFile("PENDING.md", "utf8");

test("Task 41 discovery queries use public visibility filters and four-card caps", () => {
  assert.match(discovery, /from\("news"\)[\s\S]*eq\("status", "published"\)/);
  assert.match(discovery, /from\("alerts"\)[\s\S]*eq\("status", "active"\)/);
  assert.match(discovery, /from\("accident_reports"\)[\s\S]*eq\("status", "approved"\)/);
  assert.match(discovery, /items\.slice\(0, 4\)/);
  assert.match(discovery, /currentArticleIds/);
  assert.match(discovery, /relatedArticleIds/);
});

test("Task 41 discovery uses existing taxonomy routes and safe sister links", () => {
  assert.match(discovery, /useHazardTypes/);
  assert.match(discovery, /useReportSeverities/);
  assert.match(discovery, /search=\{kind === "alerts" \? \{ hazard: value\.value \} : \{ severity: value\.value \}\}/);
  assert.match(discovery, /https:\/\/mjengohub\.co\.ke/);
  assert.match(discovery, /https:\/\/mjengonetworks\.co\.ke/);
  assert.match(discovery, /target="_blank" rel="noopener noreferrer"/);
});

test("Task 41 homepage filters public alerts and exposes platform previews", () => {
  assert.match(home, /from\("alerts"\)[\s\S]*eq\("status", "active"\)/);
  assert.match(home, /SisterPlatformPreviews/);
  assert.match(home, /TaxonomyDiscovery kind="alerts"/);
  assert.match(home, /to="\/merch"/);
  assert.match(home, /to="\/partner-with-us"/);
});

test("Task 41 ad inventory exposes named placement identifiers", () => {
  assert.match(banner, /placement = "site-default"/);
  assert.match(banner, /data-ad-placement=\{placement\}/);
});

test("Task 41 is permanently recorded in pending work", () => {
  assert.match(pending, /Task 41 — Cross-site discovery, content previews & ad inventory/);
  for (const subtask of ["41.1 Article discovery", "41.2 Alert discovery", "41.3 Report discovery", "41.4 Homepage whole-platform previews", "41.5 Alert\/Report category discovery", "41.6 Mjengo Hub\/Mjengo Networks previews", "41.7 Expanded banner-ad inventory", "41.8 Responsive\/performance\/security verification"]) {
    assert.match(pending, new RegExp(subtask));
  }
});
