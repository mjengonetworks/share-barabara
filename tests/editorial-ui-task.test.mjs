import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(file, "utf8");

test("compact report form uses progressive disclosure without changing submission safeguards", async () => {
  const form = await source("src/components/site/report-form.tsx");
  assert.match(form, /<Label htmlFor="r-title">Title<\/Label>/);
  assert.match(form, /Content \/ What happened\?/);
  assert.match(form, /<Label>Attachments<\/Label>/);
  assert.match(form, /Additional details \(optional\)/);
  assert.match(form, /<Collapsible>/);
  assert.match(form, /<CollapsibleContent/);
  assert.match(form, /value=\{form\.casualties\}/);
  assert.match(form, /value=\{form\.fatalities\}/);
  assert.match(form, /submitAccidentReport/);
  assert.match(form, /casualtyBreakdownError/);
  assert.match(form, /withUnspecifiedCasualties/);
  assert.match(form, /CollapsibleContent[\s\S]*EditorialAIButton/);
  assert.match(form, /provider: "groq"/);
  assert.match(form, /provider: "grok"/);
});

test("detail routes share editorial shell, sidebar and discovery parity", async () => {
  const [article, report, alert, issue, campaign, sidebar, discovery] = await Promise.all([
    source("src/routes/news.$slug.tsx"),
    source("src/routes/reports.$reportId.tsx"),
    source("src/routes/alerts.$alertId.tsx"),
    source("src/routes/infrastructure-issues.$issueId.tsx"),
    source("src/routes/campaigns.$slug.tsx"),
    source("src/components/site/editorial-sidebar.tsx"),
    source("src/components/site/discovery-sections.tsx"),
  ]);
  for (const route of [article, report, alert, issue, campaign]) {
    assert.match(route, /PublicBreadcrumbStrip|aria-label="Breadcrumb"/);
    assert.match(route, /max-w-\[1500px\]/);
    assert.match(route, /minmax\(280px,30%\)/);
  }
  for (const route of [report, alert, issue, campaign]) assert.match(route, /EditorialSidebar/);
  assert.match(sidebar, /PublicNewsletterCard/);
  assert.match(sidebar, /SisterPlatformPreviews/);
  assert.match(sidebar, /BannerAd/);
  assert.match(discovery, /Explore our platforms/);
  assert.match(discovery, /SisterPlatformPreviews/);
  assert.match(issue, /InfrastructureIssuePreviewCard/);
  assert.match(campaign, /CampaignPreviewCard/);
  assert.match(issue, /image_caption|image_credit/);
  assert.match(campaign, /image_caption|image_credit/);
});

test("report and alert detail recommendations use compact editorial sidebar rows", async () => {
  const report = await source("src/routes/reports.$reportId.tsx");
  const alert = await source("src/routes/alerts.$alertId.tsx");
  const compact = await source("src/components/site/compact-editorial-list.tsx");
  assert.match(report, /CompactEditorialList/);
  assert.match(alert, /CompactEditorialList/);
  assert.match(compact, /size-16/);
  assert.match(compact, /line-clamp-3/);
});

test("listing hierarchy retains three columns with three records per logical group", async () => {
  const layout = await source("src/components/site/public-layout.tsx");
  assert.match(layout, /lg:grid-cols-3/);
  // The alternating browsing specification defines each group as one lead plus
  // two supporting records; the outer three-column category structure remains.
  assert.match(layout, /supporting\.slice\(0, 2\)/);
  assert.match(layout, /View more/);
});
