import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

test("homepage uses the shared wide public content frame for every section", async () => {
  const [homepage, styles] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/styles.css"),
  ]);

  assert.equal((homepage.match(/public-content-container/g) ?? []).length, 13);
  assert.doesNotMatch(homepage, /max-w-6xl/);
  assert.match(styles, /max-width: 93\.75rem/);
  assert.match(styles, /padding-inline: 1rem/);
  assert.match(styles, /padding-inline: 1\.5rem/);
});

test("homepage and public reference pages share responsive container gutters", async () => {
  const [homepage, news, reports, alerts] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/routes/news.index.tsx"),
    read("src/routes/reports.index.tsx"),
    read("src/routes/alerts.index.tsx"),
  ]);

  assert.match(homepage, /public-content-container/);
  assert.match(news, /max-w-7xl px-4 sm:px-6/);
  assert.match(reports, /max-w-\[1500px\] px-4 sm:px-6/);
  assert.match(alerts, /max-w-\[1500px\] px-4 sm:px-6/);
});

test("homepage previews opt out of nested narrow containers", async () => {
  const [homepage, editorialPreview, mjengoPreviews] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/components/site/global-editorial-preview.tsx"),
    read("src/components/site/mjengo-previews.tsx"),
  ]);

  assert.match(
    homepage,
    /<HomepageContentPreviews(?:\s+infrastructureTaxonomy=\{homepageTaxonomy\.infrastructure\})? \/>/,
  );
  assert.match(homepage, /<HomepageMediaFeedPreview \/>/);
  assert.doesNotMatch(homepage, /<GlobalEditorialPreview/);
  assert.match(homepage, /<MjengoPreviews context="home" fullWidth \/>/);
  assert.match(editorialPreview, /fullWidth = false/);
  assert.match(editorialPreview, /fullWidth \? "w-full" : "mx-auto max-w-6xl px-4"/);
  assert.match(mjengoPreviews, /fullWidth = false/);
  assert.match(mjengoPreviews, /fullWidth \? "w-full" : "mx-auto w-full max-w-6xl px-4 sm:px-6"/);
});
