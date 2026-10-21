import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Copy Link uses exactly one blank line between title and canonical URL", async () => {
  const source = await read("src/components/site/article-share-toolbar.tsx");
  assert.match(source, /return `\$\{title\}\\n\\n\$\{url\}`/);
  assert.match(source, /publicCanonicalUrl\(window\.location\.pathname\)/);
});

test("shared content routes generate SSR Open Graph, Twitter and canonical metadata", async () => {
  const [seo, news, alerts, reports, infra, campaigns, profile] = await Promise.all([
    read("src/lib/seo.ts"),
    read("src/routes/news.$slug.tsx"),
    read("src/routes/alerts.$alertId.tsx"),
    read("src/routes/reports.$reportId.tsx"),
    read("src/routes/infrastructure-issues.$issueId.tsx"),
    read("src/routes/campaigns.$slug.tsx"),
    read("src/routes/u.$userId.tsx"),
  ]);
  for (const route of [news, alerts, reports, infra, campaigns, profile]) assert.match(route, /socialHead/);
  for (const tag of ["og:title", "og:description", "og:image", "og:url", "twitter:card", "twitter:image"]) assert.match(seo, new RegExp(tag.replace(":", ":")));
  assert.match(seo, /https:\/\/sharebarabara\.co\.ke/);
  assert.match(seo, /FALLBACK_SOCIAL_IMAGE/);
  assert.match(alerts, /initialData: loaderData/);
  assert.match(infra, /initialData: loaderData/);
  assert.match(campaigns, /initialData: loaderData/);
});
