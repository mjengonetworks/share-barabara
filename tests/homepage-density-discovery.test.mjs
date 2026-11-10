import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage uses compact honest empty states and compact section spacing", async () => {
  const [homepage, previews] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/components/site/homepage-content-previews.tsx"),
  ]);
  assert.doesNotMatch(homepage, /py-10|py-8|py-4 sm:py-5/);
  assert.match(homepage, /py-4/);
  assert.doesNotMatch(previews, /if \(!items\.length\) return null/);
  assert.match(previews, /No published videos yet/);
  assert.match(previews, /px-4 py-3/);
  assert.match(previews, /py-4/);
  assert.doesNotMatch(homepage, /rounded border border-dashed border-border p-8/);
});

test("homepage Media & Feed renders up to three latest groups without fake rankings", async () => {
  const source = await read("src/components/site/global-editorial-preview.tsx");
  assert.match(source, /const items = groups\.latest/);
  assert.match(source, /slice\(index \* 3, index \* 3 \+ 3\)/);
  assert.doesNotMatch(source, /Windowed view analytics is not available yet/);
  assert.match(source, /Most Viewed rankings will return/);
});

test("homepage directory discovery uses public pages and unsuspended profiles", async () => {
  const [source, homepage] = await Promise.all([
    read("src/components/site/homepage-directory-discovery.tsx"),
    read("src/routes/index.tsx"),
  ]);
  assert.match(source, /from\("pages"\)/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /eq\("suspended", false\)/);
  assert.match(source, /profile\.id !== featuredProfile\?\.id/);
  assert.match(source, /\/pages/);
  assert.match(source, /\/u\/\$userId/);
  assert.match(source, /Featured profile/);
  assert.doesNotMatch(homepage, /FeaturedPageCard/);
});
