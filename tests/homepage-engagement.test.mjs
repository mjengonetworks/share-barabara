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
  assert.match(ad, /selectEligibleBannerAds/);
});

test("advertising management retains admin-gated CRUD and adds edit support", async () => {
  const adminAds = await source("src/routes/_authenticated/admin/banner-ads.tsx");
  const migration = await source(
    "supabase/migrations/20261029120000_banner_ad_placements_review.sql",
  );
  assert.match(adminAds, /createFileRoute\("\/_authenticated\/admin\/banner-ads"\)/);
  assert.match(adminAds, /supabase\.from\("banner_ads"\)\.update/);
  assert.match(adminAds, /toggleActive/);
  assert.match(adminAds, /supabase\.from\("banner_ads"\)\.delete/);
  assert.match(adminAds, /Save changes/);
  assert.match(adminAds, /starts_at/);
  assert.match(adminAds, /ends_at/);
  assert.match(adminAds, /priority/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS placement/);
  assert.match(migration, /banner_ads_public_read/);
  assert.match(migration, /active = true/);
});

test("report hash navigation retries after the conditional submission card mounts", async () => {
  const reports = await source("src/routes/reports.index.tsx");
  assert.match(reports, /useEffect/);
  assert.match(reports, /window\.location\.hash !== "#report-form"/);
  assert.match(reports, /document\.getElementById\("report-form"\)/);
  assert.match(reports, /scrollIntoView/);
  assert.match(reports, /\[featured\.length, latest\.length, isLoading\]/);
  assert.match(reports, /to="\/auth"/);
});

test("homepage newsletter keeps existing submission component and constrained layout", async () => {
  const homepage = await source("src/routes/index.tsx");
  const newsletter = await source("src/components/site/newsletter-form.tsx");

  assert.match(homepage, /max-w-5xl/);
  assert.match(homepage, /<NewsletterForm[\s\S]*variant="gold"/);
  assert.match(newsletter, /newsletter_subscribers/);
  assert.match(newsletter, /Enter a valid email address/);
});


test("Partner With Us validates and persists only the existing enquiry contract", async () => {
  const partner = await source("src/routes/partner-with-us.tsx");
  const admin = await source("src/routes/_authenticated/admin/partner-enquiries.tsx");
  assert.match(partner, /partner_enquiries/);
  assert.match(partner, /company\.trim\(\)/);
  assert.match(partner, /contact_email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(partner, /goals\.trim\(\)/);
  assert.match(partner, /Enter a valid contact email/);
  assert.match(partner, /minLength=\{10\}/);
  assert.match(partner, /user_id: user\?\.id \?\? null/);
  assert.match(admin, /partner_enquiries/);
});
