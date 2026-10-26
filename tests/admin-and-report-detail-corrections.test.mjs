import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("admin content listings use the Alerts table architecture with distinct columns", () => {
  const routes = {
    articles: ["Article", "Category", "Author", "Status", "Views", "Posted"],
    reports: ["Incident / location", "County", "Severity", "Status", "Reported by", "Views", "Posted"],
    campaigns: ["Campaign", "Dates", "Status"],
    infrastructure: ["Issue", "Location", "Issue type", "Status", "Reported by", "Posted"],
  };
  for (const [route, headings] of Object.entries(routes)) {
    const source = read(`src/routes/_authenticated/admin/${route === "infrastructure" ? "infrastructure-issues" : route}.tsx`);
    assert.match(source, /<Table>/, `${route} should render a real table`);
    assert.match(source, /<TableHeader>/, `${route} should render table headings`);
    assert.match(source, /<TableBody>/, `${route} should render table rows`);
    for (const heading of headings) assert.match(source, new RegExp(`<TableHead[^>]*>${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(source, /w-\[86px\]/, `${route} should reserve the compact thumbnail column`);
  }
});

test("report creation exposes Editorial AI before the ordinary report fields", () => {
  const form = read("src/components/site/report-form.tsx");
  assert.ok(form.indexOf("const editorialAiControls") < form.indexOf('id="r-title"'));
  assert.match(form, /contentType="report"/);
  assert.match(form, /provider: "groq"/);
  assert.match(form, /provider: "grok"/);
  assert.doesNotMatch(form, /fatalities:\s*0|casualties:\s*0/);
});

test("campaign and infrastructure editors place Editorial AI before content fields", () => {
  const campaign = read("src/routes/_authenticated/admin/campaigns.tsx");
  const infrastructure = read("src/routes/_authenticated/admin/infrastructure-issues.tsx");
  assert.ok(campaign.indexOf("<EditorialAIButton") < campaign.indexOf('id="c-title"'));
  assert.ok(infrastructure.indexOf("<EditorialAIButton") < infrastructure.indexOf("Issue title"));
});

test("report detail uses location in the header and date below the title", () => {
  const detail = read("src/routes/reports.$reportId.tsx");
  assert.doesNotMatch(detail, />All reports</);
  assert.match(detail, /Incident date:/);
  assert.match(detail, /search=\{\{ county: report\.county \}\}/);
  assert.match(detail, /\/reports\?road=\$\{encodeURIComponent\(report\.road\)\}/);
  assert.match(detail, /PublicBreadcrumbStrip/);
});

test("report browsing supports canonical road filtering and breadcrumb wrapping", () => {
  const listing = read("src/routes/reports.index.tsx");
  const layout = read("src/components/site/public-layout.tsx");
  assert.match(listing, /road\?: string/);
  assert.match(listing, /roadFilter.*r\.road/);
  assert.match(layout, /flex-wrap/);
  assert.match(layout, /max-w-full truncate/);
});

test("admin media paths resolve legacy storage object paths through the media bucket", () => {
  const storage = read("src/lib/storage.ts");
  assert.match(storage, /export function mediaPublicUrl/);
  assert.match(storage, /from\("media"\)\.getPublicUrl/);
  for (const file of ["alerts", "articles", "reports", "campaigns", "infrastructure-issues"]) {
    assert.match(read(`src/routes/_authenticated/admin/${file}.tsx`), /mediaPublicUrl\(/);
  }
});
