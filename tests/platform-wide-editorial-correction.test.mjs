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
  assert.match(layout, /px-4 py-6 sm:-mx-8 sm:px-8 sm:py-8/);
  assert.match(discovery, /mt-6 space-y-6/);
  assert.match(mjengo, /mt-6 border-t border-border pt-6/);
});

test("Report and Alert detail metadata follows the shared article hierarchy", async () => {
  const report = await read("src/routes/reports.$reportId.tsx");
  const alert = await read("src/routes/alerts.$alertId.tsx");
  assert.doesNotMatch(report, />All reports</);
  assert.match(report, /Incident date:/);
  assert.match(report, /report-summary/);
  assert.match(report, /bg-white text-foreground/);
  assert.match(alert, /Published:/);
  assert.match(alert, /summary\?: string \| null/);
});

test("Report and Alert summaries have an additive reviewed schema and CMS fields", async () => {
  const migration = await read("supabase/migrations/20261030190000_report_alert_summaries_review.sql");
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(migration, /accident_reports[\s\S]*ADD COLUMN IF NOT EXISTS summary TEXT/);
  assert.match(migration, /alerts[\s\S]*ADD COLUMN IF NOT EXISTS summary TEXT/);
  assert.match(editor, /Editorial summary/);
  assert.match(editor, /summary: form(?:\.summary|\["summary"\])\.trim\(\) \|\| null/);
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
  assert.match(source, /Share Barabara - Share the Road: Live Hazard Alerts, Accident Reports, and Road Safety Campaigns/);
});
