import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const toolbar = read("src/components/site/article-share-toolbar.tsx");
const compatibilityShare = read("src/components/site/share-buttons.tsx");
const newsletter = read("src/components/site/public-ui.tsx");
const newsletterForm = read("src/components/site/newsletter-form.tsx");
const ecosystem = read("src/components/site/discovery-sections.tsx");
const styles = read("src/styles.css");
const article = read("src/routes/news.$slug.tsx");
const alerts = read("src/routes/alerts.$alertId.tsx");
const alertsIndex = read("src/routes/alerts.index.tsx");
const reports = read("src/routes/reports.$reportId.tsx");
const reportsIndex = read("src/routes/reports.index.tsx");
const campaigns = read("src/routes/campaigns.$slug.tsx");
const infrastructure = read("src/routes/infrastructure-issues.$issueId.tsx");

test("all public detail share surfaces resolve to one four-action toolbar", () => {
  for (const source of [article, alerts, reports, campaigns, infrastructure]) {
    assert.match(source, /ArticleShareToolbar|ShareButtons/);
  }
  assert.match(compatibilityShare, /PublicShareToolbar/);
  assert.match(toolbar, /Copy link/);
  assert.match(toolbar, /Add as a preferred source on Google/);
  assert.match(toolbar, /Follow on Google News/);
  assert.match(toolbar, /positionMenu/);
  assert.match(toolbar, /Escape/);
  assert.match(toolbar, /maxHeight/);
  assert.match(toolbar, /share-toolbar-actions grid w-full max-w-full min-w-0/);
  assert.match(toolbar, /grid-cols-\[auto_auto_minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
  assert.match(toolbar, /size-8 shrink-0 items-center justify-center/);
  assert.match(toolbar, /Google[\s\S]*News/);
  assert.match(toolbar, /Add as a preferred[\s\S]*source on Google/);
  assert.match(toolbar, /Follow on Google[\s\S]*News/);
  assert.match(toolbar, /hidden sm:inline.*Add as a preferred source on Google/);
  assert.match(toolbar, /hidden sm:inline.*Follow on Google News/);
  assert.match(toolbar, /src="\/google-news-icon\.svg"/);
  assert.match(toolbar, /sm:w-max sm:grid-cols-\[auto_auto_max-content_max-content\]/);
  assert.doesNotMatch(toolbar, /flex-wrap/);
  assert.doesNotMatch(toolbar, /grid-cols-2/);
});

test("publisher actions use distinct Google and Google News branding and the verified URL", () => {
  assert.match(toolbar, /function GoogleLogo/);
  assert.match(toolbar, /function GoogleNewsLogo/);
  assert.match(toolbar, /news\.google\.com\/search\?q=share%20barabara/);
  assert.doesNotMatch(toolbar, /Find on Google News/);
});

test("public newsletter stays gold while ecosystem cards use shared navy glass treatment", () => {
  assert.match(newsletter, /PublicNewsletterCard/);
  assert.match(newsletter, /from-amber-300/);
  assert.match(newsletterForm, /variant === "gold"/);
  assert.match(newsletterForm, /bg-brand-navy text-white/);
  assert.match(ecosystem, /from-brand-navy via-brand-blue to-brand-navy/);
  assert.match(ecosystem, /backdrop-blur/);
  assert.match(ecosystem, /text-blue-100/);
  assert.doesNotMatch(ecosystem, /from-amber-500/);
});

test("public responsive foundations prevent accumulated mobile width overflow", () => {
  assert.match(styles, /min-width: 320px/);
  assert.match(styles, /overflow-x: hidden/);
  assert.match(styles, /main \{[\s\S]*min-width: 0/);
  assert.match(styles, /public-content-container/);
});

test("category badges share the navy glass treatment without changing route semantics", () => {
  assert.match(newsletter, /publicCategoryBadgeClass/);
  assert.match(newsletter, /bg-brand-blue/);
  assert.match(newsletter, /publicCategoryBadgeSelectedClass/);
  assert.match(styles, /--color-brand-navy: var\(--brand-navy\)/);
  assert.match(styles, /--brand-navy:/);
  assert.match(article, /publicCategoryBadgeClass/);
  assert.match(alertsIndex, /publicCategoryBadgeSelectedClass/);
  assert.match(reportsIndex, /publicCategoryBadgeSelectedClass/);
});
