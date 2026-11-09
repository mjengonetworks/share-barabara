import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage suppresses empty content panels and uses compact section spacing", async () => {
  const [homepage, previews] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/components/site/homepage-content-previews.tsx"),
  ]);
  assert.doesNotMatch(homepage, /py-10|py-8/);
  assert.match(previews, /if \(!items\.length\) return null/);
  assert.match(previews, /py-4 sm:py-5/);
});

test("homepage Media & Feed renders up to three latest groups without fake rankings", async () => {
  const source = await read("src/components/site/global-editorial-preview.tsx");
  assert.match(source, /const items = groups\.latest/);
  assert.match(source, /slice\(index \* 3, index \* 3 \+ 3\)/);
  assert.doesNotMatch(source, /Windowed view analytics is not available yet/);
  assert.match(source, /Most Viewed rankings will return/);
});

test("homepage directory discovery uses public pages and unsuspended profiles", async () => {
  const source = await read("src/components/site/homepage-directory-discovery.tsx");
  assert.match(source, /from\("pages"\)/);
  assert.match(source, /from\("profiles"\)/);
  assert.match(source, /eq\("suspended", false\)/);
  assert.match(source, /profile\.id !== featuredProfile\?\.id/);
  assert.match(source, /\/pages/);
  assert.match(source, /\/u\/\$userId/);
});
