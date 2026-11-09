import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("homepage uses content-driven previews and keeps taxonomy beside its source section", async () => {
  const homepage = await read("src/routes/index.tsx");
  assert.match(
    homepage,
    /<HomepageContentPreviews(?:\s+infrastructureTaxonomy=\{homepageTaxonomy\.infrastructure\})? \/>/,
  );
  assert.match(homepage, /<HomepageMediaFeedPreview \/>/);
  assert.match(homepage, /<TaxonomyDiscovery kind="alerts" items=\{homepageTaxonomy\.alerts\} \/>/);
  assert.match(
    homepage,
    /<TaxonomyDiscovery kind="reports" items=\{homepageTaxonomy\.reports\} \/>/,
  );
  assert.match(
    homepage,
    /<TaxonomyStrip heading="Browse articles by category" items=\{homepageTaxonomy\.news\} \/>/,
  );
  assert.doesNotMatch(homepage, /Browse live alert types|Browse report severities/);
  assert.doesNotMatch(homepage, /<GlobalEditorialPreview/);
});

test("homepage content previews use the authoritative eligible feed and honest empty states", async () => {
  const previews = await read("src/components/site/homepage-content-previews.tsx");
  assert.match(previews, /getUnifiedFeed\(\{ limit: 60 \}\)/);
  assert.match(previews, /item\.kind === kind/);
  assert.match(previews, /No published infrastructure issues yet/);
  assert.match(previews, /No active public campaigns yet/);
  assert.match(previews, /No published videos yet/);
  assert.match(previews, /item\.imageUrl/);
  assert.match(previews, /youtubeId/);
});

test("homepage Media & Feed uses latest activity only until analytics is available", async () => {
  const preview = await read("src/components/site/global-editorial-preview.tsx");
  assert.match(preview, /buildMediaFeedGroups\(query\.data \?\? \[\], null/);
  assert.match(preview, /const items = groups\.latest/);
  assert.match(preview, /Array\.from\(\{ length: 3 \}/);
  assert.match(preview, /Most Viewed rankings will return/);
  assert.doesNotMatch(preview, /Most Viewed · Last 12 Hours/);
  assert.doesNotMatch(preview, /Most Viewed · Last 24 Hours/);
  assert.match(preview, /<h2 id="homepage-media-feed-heading"/);
  assert.match(preview, /href="\/feed"/);
});

test("cross-platform homepage discovery uses approved canonical copy and working directory discovery", async () => {
  const previews = await read("src/components/site/mjengo-previews.tsx");
  assert.match(previews, /Join Mjengo Networks/);
  assert.match(
    previews,
    /Find Rated Fundis, Suppliers, Contractors, Consultants and More with advanced suppliers\s+discovery/,
  );
  assert.match(previews, /href="https:\/\/mjengonetworks\.co\.ke\/directory"/);
  assert.match(
    previews,
    /Mjengo Hub - Construction news, industry insights, project tracking, and documentation\./,
  );
});

test("homepage keeps ranking analytics disabled until genuine windowed events exist", async () => {
  const homepage = await read("src/routes/index.tsx");
  const previews = await read("src/components/site/global-editorial-preview.tsx");
  assert.doesNotMatch(homepage, /viewEvents|Most Viewed · Last 12 Hours/);
  assert.match(previews, /buildMediaFeedGroups\(query\.data \?\? \[\], null/);
  assert.doesNotMatch(homepage, /supabase\.from\(["'](?:view_events|activity_views)["']/);
});
