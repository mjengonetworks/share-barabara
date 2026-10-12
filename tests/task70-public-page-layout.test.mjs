import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const layout = read("src/components/site/public-layout.tsx");
const news = read("src/routes/news.index.tsx");
const detail = read("src/routes/news.$slug.tsx");

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
  assert.match(layout, /aspect-\[16\/8\]/);
  assert.match(layout, /object-cover/);
  assert.match(layout, /Article image unavailable/);
});

test("news listing keeps the editorial lead, compact cards, sections and ad placements", () => {
  assert.match(news, /CompactEditorialColumns/);
  assert.match(news, /CompactArticleCard/);
  assert.match(news, /EditorialBand tone="pale"/);
  assert.match(news, /news-latest/);
  assert.match(news, /news-trending/);
  assert.match(news, /Featured \/ Prime Articles/);
  assert.match(news, /Articles by Category/);
  assert.match(news, /Road Safety Analysis/);
  assert.match(news, /Related Accident Reports/);
  assert.match(news, /Relevant Alerts/);
  assert.match(news, /More Articles/);
  assert.match(news, /news-context-midpoint/);
  assert.match(news, /function MostViewed/);
  assert.match(news, /Verified view activity/);
  assert.match(news, /function LatestStrip/);
  assert.match(news, /Latest update/);
  assert.match(news, /fullBleed/);
  assert.match(news, /Filter articles by category/);
  assert.match(news, /from\("accident_reports"\)/);
  assert.match(news, /from\("alerts"\)/);
});

test("article detail keeps SEO, sharing, discussion, newsletter, midpoint ad and contextual recommendations", () => {
  assert.match(detail, /loaderData\?\.article|article\?\.seo_title/);
  assert.match(detail, /initialData: loaderData\.related/);
  assert.match(detail, /initialData: loaderData\.latest/);
  assert.match(detail, /initialData: loaderData\.trending/);
  assert.match(detail, /ShareButtons/);
  assert.match(detail, /CommentSection/);
  assert.match(detail, /NewsletterForm/);
  assert.match(detail, /AdRichText content=\{article\.body\} placement="article-body"/);
  assert.match(detail, /PublicSidebar/);
  assert.match(detail, /SidebarModule/);
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
  assert.match(news, /optional = false/);
  assert.match(news, /if \(optional && !articles\.length\) return null/);
  assert.match(news, /optional\s*\/>/);
  assert.doesNotMatch(news, /No featured published articles are available yet/);
  assert.match(news, /all\.filter\(\(article\) => article\.featured\)/);
  assert.match(news, /analysis = all\.filter/);
  assert.match(news, /relatedReports\.length \? \(/);
  assert.match(news, /relatedAlerts\.length/);
  assert.match(news, /key=\{categoryName\}/);
  assert.match(news, /search=\{\{ category: categoryName \}\}/);
});

test("article detail preserves stored images and has a neutral fallback for image-less published records", () => {
  assert.match(detail, /article\.image_url/);
  assert.match(detail, /src=\{heroRoad\}/);
  assert.match(detail, /Share Barabara newsroom/);
});

test("batch one visual correction keeps listing and detail density compact", () => {
  assert.match(layout, /CompactEditorialColumn/);
  assert.match(layout, /w-\[38%\]/);
  assert.match(news, /Lead stories/);
  assert.match(news, /On the road/);
  assert.match(news, /Community watch/);
  assert.match(detail, /text-\[28px\].*sm:text-\[34px\]/);
  assert.match(detail, /max-w-\[1500px\].*lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,30%\)\]/s);
  assert.match(detail, /variant="sidebar"/);
  assert.match(detail, /bg-gradient-to-br from-brand-blue/);
  assert.match(detail, /aria-label="Breadcrumb"/);
});
