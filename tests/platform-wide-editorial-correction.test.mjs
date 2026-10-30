import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("platform spacing uses compact shared bands and discovery gaps", async () => {
  const [layout, discovery, mjengo] = await Promise.all([
    read("src/components/site/public-layout.tsx"),
    read("src/components/site/discovery-sections.tsx"),
    read("src/components/site/mjengo-previews.tsx"),
  ]);
  assert.match(layout, /px-4 py-4 sm:-mx-8 sm:px-8 sm:py-5/);
  assert.match(discovery, /mt-6 space-y-6/);
  assert.match(mjengo, /mt-6 border-t border-border pt-6/);
});

test("Report and Alert detail metadata follows the shared article hierarchy", async () => {
  const report = await read("src/routes/reports.$reportId.tsx");
  const alert = await read("src/routes/alerts.$alertId.tsx");
  assert.doesNotMatch(report, />All reports</);
  assert.match(report, /Publication date:/);
  assert.match(report, /text-\[24\.7px\]/);
  assert.match(report, /report-summary/);
  assert.match(report, /bg-white text-foreground/);
  assert.doesNotMatch(alert, /Published:/);
  assert.match(alert, /Alert \/ Hazard/);
  assert.match(alert, /longDate\(alert\.created_at\)[\s\S]*?publicStatus/);
  assert.match(alert, /By\{" "\}/);
  const alertView = alert.slice(alert.indexOf('<article'));
  assert.ok(alertView.indexOf("ShareButtons") < alertView.indexOf("UserAvatar"));
  assert.ok(alertView.indexOf("UserAvatar") < alertView.indexOf("Alert summary"));
  assert.match(alert, /under_resolution/);
  assert.match(alert, /In Progress/);
  assert.match(alert, /publicStatus/);
  assert.match(alert, /Alert summary/);
  assert.match(alert, /border-l-4 border-brand-blue/);
  assert.match(alert, /summary\?: string \| null/);
});

test("Report and Alert public detail pages preserve the approved media and metadata order", async () => {
  const report = await read("src/routes/reports.$reportId.tsx");
  const alert = await read("src/routes/alerts.$alertId.tsx");
  assert.match(report, /Accident Report/);
  assert.match(report, /Publication date:/);
  const reportView = report.slice(report.indexOf('<article'));
  const alertView = alert.slice(alert.indexOf('<article'));
  assert.ok(reportView.indexOf("Publication date:") < reportView.indexOf("ShareButtons"));
  assert.ok(reportView.indexOf("Publication date:") < reportView.indexOf("Accident date:"));
  assert.ok(reportView.indexOf("ShareButtons") < reportView.indexOf("<figure"));
  assert.ok(reportView.indexOf("<figure") < reportView.indexOf('By{" "}'));
  assert.ok(alertView.indexOf("publicStatus") < alertView.indexOf("<MapPin"));
  assert.ok(alertView.indexOf("<MapPin") < alertView.indexOf("ShareButtons"));
  assert.ok(alertView.indexOf("ShareButtons") < alertView.indexOf("<figure"));
  assert.ok(alertView.indexOf("<figure") < alertView.indexOf("UserAvatar"));
});

test("Alert lifecycle status keeps null unselected and maps legacy values", async () => {
  const route = await read("src/routes/alerts.$alertId.tsx");
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(route, /alert\.status === "under_resolution" \|\| alert\.status === "in_progress"/);
  assert.match(route, /: null;/);
  assert.match(editor, /No status selected/);
  assert.match(editor, /value === "none" \? "" : value/);
  assert.match(editor, /status: form\.alert_status \|\| null/);
});

test("public editorial detail surfaces keep attribution compact and do not render profile biographies", async () => {
  const files = [
    "src/routes/news.$slug.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/alerts.$alertId.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
    "src/routes/videos.tsx",
  ];
  const sources = await Promise.all(files.map(read));
  for (const source of sources) {
    assert.doesNotMatch(source, /profile\.bio|biography/);
    assert.doesNotMatch(source, /Reported by|Submitted by/);
  }
  assert.match(sources[0], /UserAvatar/);
  assert.match(sources[1], /UserAvatar/);
  assert.match(sources[2], /UserAvatar/);
});

test("Report and Alert summaries have an additive reviewed schema and CMS fields", async () => {
  const migration = await read("supabase/migrations/20261030190000_report_alert_summaries_review.sql");
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(migration, /accident_reports[\s\S]*ADD COLUMN IF NOT EXISTS summary TEXT/);
  assert.match(migration, /alerts[\s\S]*ADD COLUMN IF NOT EXISTS summary TEXT/);
  assert.match(editor, /Editorial summary/);
  assert.match(editor, /form\["summary"\]\.trim\(\) \|\| null/);
  assert.match(editor, /summarySchemaQuery/);
  assert.match(editor, /summarySupported/);
  assert.match(editor, /disabled=\{!summarySupported\}/);
});

test("Article categories remain multi-select and are searchable", async () => {
  const source = await read("src/components/site/category-multi-select.tsx");
  assert.match(source, /Search categories/);
  assert.match(source, /DropdownMenuCheckboxItem/);
  assert.match(source, /value\.includes\(c\.name\)/);
});

test("content AI state resets on record changes and supports collapse", async () => {
  const source = await read("src/components/site/share-barabara-ai.tsx");
  assert.match(source, /setSummary\(null\)/);
  assert.match(source, /setMessages\(\[\]\)/);
  assert.match(source, /requestVersion/);
  assert.match(source, /Collapse AI panel/);
  assert.match(source, /Expand AI panel/);
});

test("homepage metadata uses the approved platform title", async () => {
  const source = await read("src/routes/__root.tsx");
  const homepage = await read("src/routes/index.tsx");
  assert.match(source, /Share Barabara - Share the Road: Live Hazard Alerts, Accident Reports, and Road Safety Campaigns/);
  assert.match(homepage, /Share Barabara - Share the Road: Live Hazard Alerts, Accident Reports, and Road Safety Campaigns/);
});

test("public and admin fatality terminology is standardized without changing data keys", async () => {
  const files = [
    "src/routes/reports.$reportId.tsx",
    "src/routes/statistics.tsx",
    "src/routes/roads.$slug.tsx",
    "src/routes/index.tsx",
    "src/routes/_authenticated/admin/reports.tsx",
    "src/routes/_authenticated/admin/crash-statistics.tsx",
    "src/components/site/discovery-sections.tsx",
    "src/components/site/public-layout.tsx",
    "src/components/site/official-statistics-manager.tsx",
  ];
  const sources = await Promise.all(files.map(read));
  for (const source of sources) assert.doesNotMatch(source, /\bDeaths?\b/);
  const metrics = await read("src/lib/report-metrics.ts");
  assert.match(metrics, /fatalityLabel/);
  assert.match(metrics, /value === 1 \? "fatality" : "fatalities"/);
  const report = await read("src/routes/reports.$reportId.tsx");
  assert.match(report, /report\.fatalities/);
  assert.match(report, /Accident date: \{longDate\(report\.occurred_at\)\}/);
});

test("homepage hero uses the approved road-user wording without adding country-selection UI", async () => {
  const homepage = await read("src/routes/index.tsx");
  assert.match(homepage, /Share Barabara brings together live hazard alerts, crash data and road safety news from[\s\S]*?Kenya and beyond\. Reported directly by road users/);
  assert.doesNotMatch(homepage, /Reported by the people who use these roads every day/);
  assert.match(homepage, /Share Barabara Kenya/);
  assert.doesNotMatch(homepage, /country selector|supported countries|country switcher/i);
});

test("homepage hero preserves the complete approved structure and actions", async () => {
  const homepage = await read("src/routes/index.tsx");
  const hero = homepage.slice(homepage.indexOf("Share Barabara Kenya"), homepage.indexOf("<SearchBar"));
  for (const expected of [
    "Share Barabara Kenya",
    "Every journey home should end at home.",
    "Share Barabara brings together live hazard alerts, crash data and road safety news",
    "Kenya and beyond.",
    "Reported directly by road users",
  ]) assert.match(hero, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(homepage, /<SearchBar className="mt-6 max-w-md"\s*\/>/);
  assert.match(homepage, /<Link to="\/alerts">[\s\S]*?See live alerts/);
  assert.match(homepage, /<Link to="\/statistics">View the statistics<\/Link>/);
  assert.match(homepage, /Mjengo Hub/);
  assert.match(homepage, /Mjengo Networks/);
});
