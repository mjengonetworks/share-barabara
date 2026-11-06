import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("isolated preview uses synthetic feed data and existing presentation components", async () => {
  const route = await read("src/routes/staging-media-feed-preview.tsx");
  const data = await read("src/lib/staging-media-feed-preview.ts");
  const component = await read("src/components/site/staging-media-feed-preview.tsx");
  assert.match(route, /staging-media-feed-preview/);
  assert.match(data, /Synthetic preview data/);
  assert.match(data, /preview-article-1/);
  assert.match(data, /preview-community-1/);
  assert.match(component, /EditorialTripleCard/);
  assert.match(component, /UnifiedFeedActivity/);
  assert.match(component, /grid gap-5 lg:grid-cols-3/);
});

test("preview build strips Supabase credentials and locks the Worker to the preview route", async () => {
  const build = await read("scripts/build-staging-preview.mjs");
  const server = await read("src/server.ts");
  const deploy = await read("scripts/deploy-staging-preview.mjs");
  assert.match(build, /env\[key\] = ""/);
  assert.match(build, /VITE_SUPABASE_URL/);
  assert.match(build, /staging-preview/);
  assert.match(server, /isIsolatedPreviewRuntime/);
  assert.match(server, /isAllowedPreviewPath/);
  assert.match(server, /status: 404/);
  assert.match(deploy, /STAGING_PREVIEW_DEPLOY !== "1"/);
  assert.match(deploy, /share-barabara-staging/);
  assert.match(deploy, /delete config\.triggers/);
});

test("preview mode disables the production shell and external ad script", async () => {
  const root = await read("src/routes/__root.tsx");
  assert.match(root, /isIsolatedStagingPreview/);
  assert.match(root, /STAGING · SYNTHETIC READ-ONLY PREVIEW/);
  assert.match(root, /scripts: isIsolatedStagingPreview/);
  assert.match(root, /if \(isIsolatedStagingPreview\)/);
});
