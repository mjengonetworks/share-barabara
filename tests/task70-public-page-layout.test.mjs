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
  assert.match(news, /function ArticleGrid[\s\S]*placement\?: string/);
  assert.match(news, /FeaturedLeadCard/);
  assert.match(news, /CompactArticleCard/);
  assert.match(news, /EditorialBand tone="pale"/);
  assert.match(news, /news-latest/);
  assert.match(news, /news-featured/);
  assert.match(news, /news-trending/);
  assert.match(news, /news-context-midpoint/);
  assert.match(news, /from\("accident_reports"\)/);
  assert.match(news, /from\("alerts"\)/);
});

test("article detail keeps SEO, sharing, discussion, newsletter, midpoint ad and contextual recommendations", () => {
  assert.match(detail, /loaderData\?\.seo_title/);
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
