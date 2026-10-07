import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const header = read("src/components/site/site-header.tsx");
const feed = read("src/routes/feed.tsx");
const article = read("src/routes/news.$slug.tsx");
const newsIndex = read("src/routes/news.index.tsx");
const social = read("src/components/site/social-follow-section.tsx");
const ads = read("src/components/site/banner-ad.tsx");

test("Media & Feed has branded navigation, correct ordering, and no contributor nav item", () => {
  assert.match(header, /to: "\/statistics", label: "Statistics"[\s\S]*to: "\/feed", label: "Media & Feed"[\s\S]*to: "\/campaigns", label: "Campaigns"/);
  assert.match(header, /item\.to === "\/feed"/);
  assert.doesNotMatch(header, /to: "\/contributors"/);
});

test("Feed remains the canonical combined discovery surface with existing controls", () => {
  assert.match(feed, /createFileRoute\("\/feed"\)/);
  assert.match(feed, /\["new", "top", "hot"\]/);
  assert.match(feed, /SocialFollowSection/);
  assert.match(feed, /MjengoPreviews context="feed"/);
});

test("editorial previews use controlled 16:9 media with an accessible fallback", () => {
  assert.match(newsIndex, /aspect-video/);
  assert.match(newsIndex, /Newspaper className/);
  assert.match(article, /aspect-video w-full object-cover/);
  assert.match(article, /loading="lazy"/);
});

test("social discovery is configuration-driven and does not invent a handle", () => {
  assert.match(social, /from\("social_links"\)/);
  assert.match(social, /safeSocialUrl/);
  assert.doesNotMatch(social, /@sharebarabara/);
});

test("empty advertising inventory keeps the Partner With Us path and live ads intact", () => {
  assert.match(ads, /YOUR AD HERE/);
  assert.match(ads, /to="\/partner-with-us"/);
  assert.match(ads, /Visit Advertiser/);
});
