import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return fs.readFile(path, "utf8");
}

test("homepage highlights approved, deduplicated recorded road accidents", async () => {
  const homepage = await source("src/routes/index.tsx");
  assert.match(homepage, /from\("accident_reports"\)/);
  assert.match(homepage, /\.eq\("status", "approved"\)/);
  assert.match(homepage, /!report\.duplicate_of_report_id/);
  assert.match(homepage, /Recorded Road Accidents|recorded road accidents/);
  assert.match(homepage, /to="\/reports"/);
  assert.doesNotMatch(homepage, /deaths every day/);
});

test("global engagement controls and advertising fallback are scoped safely", async () => {
  const root = await source("src/routes/__root.tsx");
  const backToTop = await source("src/components/site/back-to-top.tsx");
  const ad = await source("src/components/site/banner-ad.tsx");

  assert.match(root, /<BackToTop \/>/);
  assert.match(root, /QuoteOfTheDay/);
  assert.match(root, /pathname !== "\/partner-with-us"/);
  assert.match(root, /pathname !== "\/"/);
  assert.match(backToTop, /aria-label="Back to top"/);
  assert.match(backToTop, /prefers-reduced-motion/);
  assert.match(backToTop, /window\.scrollTo/);
  assert.match(ad, /Your Ad Here/);
  assert.match(ad, /Visit Advertiser/);
  assert.match(ad, /to="\/partner-with-us"/);
});

test("advertising management retains admin-gated CRUD and adds edit support", async () => {
  const adminAds = await source("src/routes/_authenticated/admin/banner-ads.tsx");
  assert.match(adminAds, /createFileRoute\("\/_authenticated\/admin\/banner-ads"\)/);
  assert.match(adminAds, /supabase\.from\("banner_ads"\)\.update/);
  assert.match(adminAds, /toggleActive/);
  assert.match(adminAds, /supabase\.from\("banner_ads"\)\.delete/);
  assert.match(adminAds, /Save changes/);
});

test("homepage newsletter keeps existing submission component and constrained layout", async () => {
  const homepage = await source("src/routes/index.tsx");
  const newsletter = await source("src/components/site/newsletter-form.tsx");

  assert.match(homepage, /max-w-5xl/);
  assert.match(homepage, /<NewsletterForm[\s\S]*variant="gold"/);
  assert.match(newsletter, /newsletter_subscribers/);
  assert.match(newsletter, /Enter a valid email address/);
});
