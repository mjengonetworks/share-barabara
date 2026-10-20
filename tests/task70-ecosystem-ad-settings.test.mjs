import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const discovery = read("src/components/site/discovery-sections.tsx");
const adminSettings = read("src/routes/_authenticated/admin/footer.tsx");
const adminNav = read("src/routes/_authenticated/admin/route.tsx");
const ads = read("src/components/site/banner-ad.tsx");
const migration = read(
  "supabase/migrations/20261021090000_task70_ecosystem_advertising_settings.sql",
);

test("public ecosystem previews use persisted settings with complete approved defaults", () => {
  assert.match(discovery, /from\("ecosystem_previews_public"\)/);
  assert.match(
    discovery,
    /Construction news, industry insights, project tracking and documentation from Kenya and beyond\./,
  );
  assert.match(
    discovery,
    /professionals and service providers, with pricing, material price indices and automated quote generation from registered suppliers\./,
  );
  assert.doesNotMatch(discovery, /line-clamp-2 text-xs leading-5 text-blue-100\/85/);
});

test("site settings exposes administrator-only ecosystem editing and preview", () => {
  assert.match(adminNav, /label: "Site Settings"/);
  assert.match(adminSettings, /rank >= ROLE_RANK\.admin/);
  assert.match(adminSettings, /from\("ecosystem_previews"\)/);
  assert.match(adminSettings, /Save ecosystem previews/);
  assert.match(adminSettings, /Preview card/);
  assert.match(adminSettings, /updated_by/);
});

test("reviewed migration protects ecosystem and fallback settings with admin-only writes", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.ecosystem_previews/);
  assert.match(migration, /ecosystem_previews_admin_write/);
  assert.match(migration, /has_min_role\(auth\.uid\(\), 'admin'\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.advertising_settings/);
  assert.match(migration, /advertising_settings_admin_write/);
  assert.match(migration, /ecosystem_previews_public/);
  assert.match(migration, /advertising_settings_public/);
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.ecosystem_previews FROM anon, authenticated/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.advertising_settings FROM anon, authenticated/,
  );
  assert.doesNotMatch(migration, /UPDATE public\.banner_ads[\s\S]*WHERE[\s\S]*title/i);
  assert.doesNotMatch(migration, /example\./i);
  assert.match(migration, /security_invoker = false/);
  assert.match(migration, /touch_updated_at/);
  assert.match(migration, /enabled_order_idx/);
  assert.match(migration, /ON CONFLICT \(slug\) DO NOTHING/);
  assert.match(migration, /ON CONFLICT \(id\) DO NOTHING/);
});

test("ads only render eligible campaigns and use the configurable house fallback", () => {
  assert.match(ads, /from\("advertising_settings_public"\)/);
  assert.match(ads, /isGenuinePaidAd/);
  assert.match(ads, /candidate\.is_demo !== true/);
  assert.doesNotMatch(ads, /DEMO_AD_TITLES|lower\(title\)|example\./i);
  assert.match(ads, /fallback\.fallback_headline/);
  assert.match(ads, /Your Ad Here/);
  assert.match(ads, /fallback\.fallback_enabled/);
  assert.doesNotMatch(ads, /Book Your Roadworthiness Test/);
});

test("approved sharing toolbar remains untouched", () => {
  const toolbar = read("src/components/site/article-share-toolbar.tsx");
  assert.match(toolbar, /GoogleNewsLogo/);
  assert.match(toolbar, /GOOGLE_NEWS_SEARCH_URL/);
});
