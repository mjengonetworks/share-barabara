import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const header = read("src/components/site/site-header.tsx");
const richtext = read("src/lib/richtext.tsx");
const feed = read("src/routes/feed.tsx");
const mjengo = read("src/lib/mjengo.functions.ts");
const previews = read("src/components/site/mjengo-previews.tsx");
const ads = read("src/components/site/banner-ad.tsx");
const discovery = read("src/components/site/discovery-sections.tsx");
const share = read("src/components/site/share-buttons.tsx");
const article = read("src/routes/news.$slug.tsx");
const publicAI = read("src/lib/ai/public.functions.ts");

test("primary navigation keeps /feed compatibility with the requested Media & Feed order", () => {
  assert.match(header, /to: "\/news", label: "News & Articles"/);
  assert.match(header, /to: "\/statistics", label: "Statistics"[\s\S]*to: "\/feed", label: "Media & Feed"[\s\S]*to: "\/campaigns", label: "Campaigns"/);
  assert.doesNotMatch(header, /to: "\/contributors", label: "Contributors"/);
});

test("legacy paragraph markup becomes safe spaced text blocks", () => {
  assert.match(richtext, /replace\(\/<\\\/p/);
  assert.match(richtext, /leading-7/);
  assert.doesNotMatch(richtext, /dangerouslySetInnerHTML=\{\{ __html:.*content/);
});

test("Media & Feed includes a social follow surface and attributed Mjengo previews", () => {
  assert.match(feed, /SocialFollowSection/);
  assert.match(feed, /MjengoPreviews context="feed"/);
  assert.match(previews, /item\.author/);
  assert.match(mjengo, /dc:creator/);
  assert.match(previews, /Source: Mjengo Hub/);
});

test("Mjengo source URLs remain bounded and allowlisted", () => {
  assert.match(mjengo, /url\.protocol !== "https:"/);
  assert.match(mjengo, /origins\.includes\(url\.origin\)/);
  assert.match(mjengo, /author: field/);
});

test("article cards use accessible responsive 16:9 presentation", () => {
  assert.match(discovery, /alt=\{article\.title\}[\s\S]*aspect-video[\s\S]*object-cover/);
  assert.match(discovery, /alt=\{report\.title\}[\s\S]*aspect-video[\s\S]*object-cover/);
});

test("unsold ads use the Partner With Us CTA while paid ads remain untouched", () => {
  assert.match(ads, /YOUR AD HERE/);
  assert.match(ads, /to="\/partner-with-us"/);
  assert.match(ads, /Visit Advertiser/);
});

test("related articles are centered and ecosystem language is accurate", () => {
  assert.match(article, /mx-auto max-w-2xl rounded border-l-4/);
  assert.match(discovery, /Across our ecosystem/);
  assert.match(discovery, /Explore our platforms/);
  assert.doesNotMatch(discovery, /Explore sister platforms/);
});

test("Google preferred-source control is compact rather than circular", () => {
  assert.match(share, /google_source_url/);
  assert.match(share, /rounded-md border border-border/);
  assert.doesNotMatch(share, /google_source_label[^\n]*rounded-full/);
});

test("article AI can use bounded published article text without claiming external verification", () => {
  assert.match(publicAI, /sourceText\?: string/);
  assert.match(publicAI, /input\.sourceText/);
  assert.match(article, /sourceText=\{`\$\{article\.summary/);
  assert.match(publicAI, /contextType !== "general"/);
  assert.doesNotMatch(publicAI, /SearXNG|provision/i);
});

test("Feed remains a public route and does not invent external social URLs", () => {
  assert.match(feed, /createFileRoute\("\/feed"\)/);
  assert.match(read("src/components/site/social-follow-section.tsx"), /from\("social_links"\)/);
  assert.match(read("src/components/site/social-follow-section.tsx"), /safeSocialUrl/);
});
