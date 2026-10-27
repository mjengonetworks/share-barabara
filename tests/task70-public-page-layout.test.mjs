import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const layout = read("src/components/site/public-layout.tsx");
const news = read("src/routes/news.index.tsx");
const detail = read("src/routes/news.$slug.tsx");
const publicUi = read("src/components/site/public-ui.tsx");
const alerts = read("src/routes/alerts.index.tsx");
const reports = read("src/routes/reports.index.tsx");
const discovery = read("src/components/site/discovery-sections.tsx");
const feed = read("src/routes/feed.tsx");
const profile = read("src/routes/u.$userId.tsx");
const roads = read("src/routes/roads.$slug.tsx");
const search = read("src/routes/search.tsx");

test("Task 70 shared public layout exposes the planned editorial primitives", () => {
  for (const name of [
    "SectionHeader",
    "FeaturedLeadCard",
    "CompactArticleCard",
    "ArticleCardGrid",
    "EditorialBand",
    "PublicSidebar",
    "SidebarModule",
  ]) {
    assert.match(layout, new RegExp(`export function ${name}`));
  }
  assert.match(layout, /aspect-\[16\/9\]/);
  assert.match(layout, /object-cover/);
  assert.match(layout, /Article image unavailable/);
});

test("news listing keeps the editorial lead, compact cards, sections and ad placements", () => {
  // The main listing is category/entity-first; lead/latest/trending section
  // labels belong to the category-detail experience, not this grid.
  assert.match(news, /CategoryEntityCard/);
  assert.match(news, /groupLatestByEntity/);
  assert.match(news, /CompactArticleCard/);
  assert.match(news, /title="Browse by Category"/);
  assert.match(news, /Related Accident Reports/);
  assert.match(news, /Relevant Alerts/);
  assert.match(news, /news-context-midpoint/);
  assert.match(news, /function LatestStrip/);
  assert.match(news, /Latest updates/);
  assert.match(news, /size-14 shrink-0 rounded object-cover/);
  assert.match(news, /fullBleed/);
  assert.match(news, /Filter articles by category/);
  assert.match(news, /from\("accident_reports"\)/);
  assert.match(news, /from\("alerts"\)/);
  assert.doesNotMatch(news, /Lead story|Latest in this topic|More from this topic/);
});

test("article detail keeps SEO, sharing, discussion, newsletter, midpoint ad and contextual recommendations", () => {
  assert.match(detail, /loaderData\?\.article|article\?\.seo_title/);
  assert.match(detail, /initialData: loaderData\.related/);
  assert.match(detail, /initialData: loaderData\.latest/);
  assert.match(detail, /initialData: loaderData\.trending/);
  assert.match(detail, /ArticleShareToolbar/);
  assert.match(detail, /CommentSection/);
  assert.match(detail, /ArticleSidebar/);
  assert.match(detail, /BannerAd placement="article-body-mid"/);
  assert.match(detail, /from\("accident_reports"\)/);
  assert.match(detail, /from\("alerts"\)/);
  assert.match(detail, /article!\.road[\s\S]*query\.eq\("road"/);
  assert.match(detail, /query\.eq\("county", article!\.county!/);
});

test("contextual incident recommendations remain public-only and status-filtered", () => {
  assert.match(detail, /\.eq\("status", "approved"\)/);
  assert.match(detail, /\.eq\("status", "active"\)/);
  assert.match(news, /\.eq\("status", "approved"\)/);
  assert.match(news, /\.eq\("status", "active"\)/);
});

test("public news data is loader-backed and published-only before hydration", () => {
  assert.match(news, /loader: async \(\): Promise<NewsIndexLoaderData>/);
  assert.match(news, /fetchPublishedArticles/);
  assert.match(news, /\.eq\("status", "published"\)/);
  assert.match(news, /initialData: loaderData\.latest/);
  assert.match(news, /initialData: loaderData\.all/);
  assert.match(news, /initialData: loaderData\.relatedReports/);
  assert.match(news, /initialData: loaderData\.relatedAlerts/);
});

test("optional editorial sections collapse without synthetic content", () => {
  assert.match(news, /groupLatestByEntity/);
  assert.match(news, /if \(!modules\.length\) return <EmptyState/);
  assert.doesNotMatch(news, /No featured published articles are available yet/);
  assert.match(news, /relatedReports\.length \? \(/);
  assert.match(news, /relatedAlerts\.length/);
  assert.match(news, /encodeURIComponent\(entity\)/);
});

test("article detail preserves stored images and has a neutral fallback for image-less published records", () => {
  assert.match(detail, /article\.image_url/);
  assert.match(detail, /src=\{heroRoad\}/);
  assert.match(detail, /Share Barabara newsroom/);
});

test("batch one visual correction keeps listing and detail density compact", () => {
  assert.match(layout, /CompactEditorialColumn/);
  assert.match(layout, /w-\[38%\]/);
  assert.match(news, /CategoryEntityCard/);
  assert.match(detail, /text-\[23\.52px\].*sm:text-\[34px\]/);
  assert.match(detail, /max-w-\[1500px\].*lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,30%\)\]/s);
  assert.match(detail, /ArticleSidebar/);
  assert.match(publicUi, /from-amber-300/);
  assert.match(detail, /aria-label="Breadcrumb"/);
});

test("editorial modules provide balanced unique lead-and-supporting card columns", () => {
  assert.match(layout, /articles\.slice\(0, 3\)/);
  // The category contract is one entity card with one lead and two rows.
  assert.match(layout, /supporting\.slice\(0, 2\)/);
  assert.match(news, /articles=\{items\}/);
  assert.match(news, /groupLatestByEntity/);
  assert.match(news, /latest: all\.slice\(0, 12\)/);
  assert.match(news, /name: "latest",\s*limit: 12/);
});

test("alerts and reports listings use shared multi-column incident editorial sections", () => {
  for (const route of [alerts, reports]) {
    assert.match(route, /CompactIncidentColumns/);
    // Listings now use the shared incident columns without a persistent form sidebar.
    assert.match(route, /EditorialBand tone="pale"/);
    assert.match(route, /EditorialBand tone="plain"/);
    assert.doesNotMatch(route, /<ul className="mt-6 space-y-6">/);
  }
  assert.match(alerts, /Important \/ Critical Alerts/);
  assert.match(alerts, /Latest Alerts/);
  assert.match(reports, /Featured Accident Reports/);
  assert.match(reports, /Latest Accident Reports/);
  assert.match(layout, /supporting\.slice\(0, 2\)/);
  assert.match(layout, /aspect-video/);
});

test("editorial preview cards omit dates while preserving allowed detail and feed timestamps", () => {
  assert.doesNotMatch(layout, /article\.published_at[\s\S]{0,120}longDate/);
  assert.match(layout, /kind === "alert"/);
  assert.doesNotMatch(discovery, /longDateWithDay\(article\.published_at\)/);
  assert.doesNotMatch(discovery, /longDate\(report\.occurred_at\)/);
  assert.doesNotMatch(feed, /timeAgo\(item\.created_at\)/);
  assert.match(feed, /timeAgo\(post\.created_at\)/);
  for (const source of [profile, roads, search]) {
    assert.doesNotMatch(source, /longDate\(a\.published_at\)/);
    assert.doesNotMatch(source, /longDate\(n\.published_at\)/);
    assert.doesNotMatch(source, /longDate\(r\.occurred_at\)/);
  }
  assert.match(detail, /longDateWithDay\(article\.published_at\)/);
});

test("post-release editorial controls preserve compact public navigation and Google destinations", () => {
  const header = read("src/components/site/site-header.tsx");
  const share = read("src/components/site/article-share-toolbar.tsx");
  assert.match(header, /border-accent bg-accent text-brand-navy/);
  assert.match(header, /item\.to === "\/feed"/);
  assert.match(header, /max-w-\[1600px\]/);
  assert.match(share, /share-toolbar-actions grid w-full max-w-full min-w-0/);
  assert.match(share, /grid-cols-\[auto_auto_minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
  assert.match(share, /aria-label="Copy link"/);
  assert.match(share, /whitespace-nowrap/);
  assert.match(share, /news\.google\.com\/search\?q=share%20barabara/);
  assert.doesNotMatch(share, /q=mjengo%20hub/);
});

test("related editorial previews use subordinate gold category labels and navy titles", () => {
  const layout = read("src/components/site/public-layout.tsx");
  const discovery = read("src/components/site/discovery-sections.tsx");
  assert.match(layout, /bg-amber-200 px-1\.5 py-0\.5 text-\[10px\].*text-brand-navy/);
  assert.match(layout, /text-brand-navy group-hover:underline/);
  assert.match(discovery, /bg-amber-200 px-1\.5 py-0\.5 text-\[10px\].*text-brand-navy/);
});
