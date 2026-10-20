import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return fs.readFile(path, "utf8");
}

test("public article detail uses one responsive article/sidebar shell", async () => {
  const detail = await source("src/routes/news.$slug.tsx");
  const sidebar = await source("src/components/site/article-detail-sidebar.tsx");
  const publicUi = await source("src/components/site/public-ui.tsx");

  assert.match(
    detail,
    /max-w-\[1500px\][\s\S]*lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,30%\)\]/,
  );
  assert.match(detail, /gap-4 px-2 py-3/);
  assert.match(detail, /rounded-xl border border-border bg-card p-3/);
  assert.match(detail, /<div className="flex flex-wrap gap-1\.5">/);
  assert.match(detail, /longDateWithDay\(article\.published_at\)/);
  assert.match(detail, /ArticleSidebar/);
  assert.doesNotMatch(detail, /DiscoverySections/);
  assert.doesNotMatch(detail, /title="Related articles"[\s\S]*grid gap-5 md:grid-cols-3/);
  assert.match(publicUi, /Stay informed/);
  assert.match(sidebar, /Related articles/);
  assert.match(sidebar, /Latest articles/);
  assert.match(sidebar, /Browse articles by category/);
  assert.match(sidebar, /Trending articles/);
  assert.match(sidebar, /Road safety context/);
  assert.match(sidebar, /Our ecosystem/);
  for (const label of [
    "Alerts",
    "Accident Reports",
    "Statistics",
    "Campaigns",
    "Media & Feed",
    "Infrastructure Issues",
  ]) {
    assert.match(sidebar, new RegExp(`label: "${label}"`));
  }
  assert.match(sidebar, /Explore Share Barabara/);
  assert.match(detail, /sidebarLatest = latest\.filter/);
  assert.match(detail, /sidebarTrending = trending\.filter/);
  assert.match(detail, /!relatedIds\.has\(item\.id\)/);
});

test("article sidebar previews omit dates and preserve compact thumbnails", async () => {
  const sidebar = await source("src/components/site/article-detail-sidebar.tsx");
  assert.match(sidebar, /aspect-video w-full object-cover/);
  assert.match(sidebar, /article\.category/);
  assert.doesNotMatch(sidebar, /published_at|longDateWithDay|formatDate/);
  assert.match(sidebar, /related\.length > 0/);
  assert.match(sidebar, /latest\.length > 0/);
  assert.match(sidebar, /trending\.length > 0/);
});

test("article share toolbar has four primary actions and an accessible social menu", async () => {
  const share = await source("src/components/site/article-share-toolbar.tsx");
  assert.match(share, /aria-haspopup="menu"/);
  assert.match(share, /aria-expanded=\{open\}/);
  assert.match(share, /event\.key === "Escape"/);
  assert.match(share, /closeOnOutsideClick/);
  assert.match(share, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(share, /GOOGLE_NEWS_SEARCH_URL/);
  assert.match(share, /news\.google\.com\/search\?q=share%20barabara&hl=en-ZA&gl=ZA&ceid=ZA%3Aen/);
  assert.match(share, /Add as a preferred source on Google/);
  assert.match(share, /Follow on Google News/);
  assert.match(share, /socialLinks\.map/);
  assert.match(share, /share-toolbar-actions grid w-full max-w-full min-w-0/);
  assert.match(share, /grid-cols-\[auto_auto_minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
  assert.match(share, /aria-label="Copy link"/);
  assert.match(share, /GoogleLogo/);
  assert.match(share, /GoogleNewsLogo/);
  assert.match(share, /Add as a preferred[\s\S]*source on Google/);
  assert.match(share, /Follow on Google[\s\S]*News/);
  assert.match(share, /border-brand-navy\/70 bg-white/);
  assert.match(share, /Add as a preferred source on Google/);
  assert.match(share, /aria-label="Follow on Google News"/);
});

test("article detail uses a canonical production URL for sharing", async () => {
  const detail = await source("src/routes/news.$slug.tsx");
  assert.match(
    detail,
    /canonicalUrl=\{`https:\/\/sharebarabara\.co\.ke\/news\/\$\{encodeURIComponent\(article\.slug\)\}`\}/,
  );
  assert.match(detail, /article-quick-summary/);
  assert.match(detail, /placement="article-body-mid"/);
});

test("article body places one related link mid-story and removes article update requests", async () => {
  const detail = await source("src/routes/news.$slug.tsx");
  assert.match(detail, /blocks\.length >= 4/);
  assert.match(detail, /Math\.floor\(blocks\.length \/ 2\)/);
  assert.match(detail, /Read also:/);
  assert.doesNotMatch(detail, /ContentRequestActions/);
});
