import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const source = (path) => fs.readFile(path, "utf8");

test("homepage keeps approved recorded accidents and engagement controls", async () => {
  const homepage = await source("src/routes/index.tsx");
  const root = await source("src/routes/__root.tsx");
  const ad = await source("src/components/site/banner-ad.tsx");
  assert.match(homepage, /recorded road accidents/);
  assert.match(homepage, /!report\.duplicate_of_report_id/);
  assert.match(homepage, /to=\"\/reports\"/);
  assert.match(root, /<BackToTop \/>/);
  assert.match(root, /<QuoteOfTheDay \/>/);
  assert.match(ad, /selectEligibleBannerAds/);
});

test("report hash navigation and Partner With Us validation remain wired", async () => {
  const reports = await source("src/routes/reports.index.tsx");
  const partner = await source("src/routes/partner-with-us.tsx");
  assert.match(reports, /window\.location\.hash !== \"#report-form\"/);
  assert.match(reports, /scrollIntoView/);
  assert.match(partner, /company\.trim\(\)/);
  assert.match(partner, /contact_email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(partner, /minLength=\{10\}/);
});
