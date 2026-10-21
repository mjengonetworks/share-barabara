import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("approved share toolbar copies title, one blank line, and canonical URL", async () => {
  const source = await read("src/components/site/article-share-toolbar.tsx");
  assert.match(source, /return `\$\{title\}\\n\\n\$\{url\}`/);
  assert.match(source, /navigator\.clipboard\.writeText\(formatShareClipboard\(title, url\)\)/);
});

test("news detail publishes server-accessible social metadata", async () => {
  const seo = await read("src/lib/seo.ts");
  const news = await read("src/routes/news.$slug.tsx");
  for (const tag of ["og:title", "og:description", "og:image", "og:url", "twitter:card", "twitter:image"]) {
    assert.match(seo, new RegExp(tag.replace(":", ":")));
  }
  assert.match(seo, /sharebarabara\.co\.ke/);
  assert.match(news, /socialHead/);
  assert.match(news, /imageUrl: article\?\.image_url/);
});
