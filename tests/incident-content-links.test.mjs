import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("incident content links are additive, canonical and editor-authorized", async () => {
  const migration = await read("supabase/migrations/20261029100000_incident_content_links_review.sql");
  const panel = await read("src/components/site/incident-relationship-panel.tsx");
  const reports = await read("src/routes/statistics.tsx");
  const tasks = await read("DEVELOPMENT_TASKS.md");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.incident_content_links/);
  assert.match(migration, /canonical_report_id UUID NOT NULL REFERENCES public\.accident_reports/);
  assert.match(migration, /content_id UUID NOT NULL REFERENCES public\.alerts/);
  assert.match(migration, /WHERE status = 'confirmed'/);
  assert.match(migration, /Only editors can confirm incident relationships/);
  assert.match(migration, /Only editors can reject incident relationship suggestions/);
  assert.match(migration, /Only editors can correct incident relationships/);
  assert.match(migration, /Only editors can revoke incident relationships/);
  assert.match(migration, /Canonical Accident Report must be approved/);
  assert.match(migration, /status = 'approved' AND duplicate_of_report_id IS NULL/);
  assert.match(migration, /published_accident_report_count/);
  assert.match(migration, /REVOKE ALL ON public\.incident_content_links FROM PUBLIC, anon, authenticated/);
  assert.match(panel, /Confirm relationship/);
  assert.match(panel, /Reject suggestion/);
  assert.match(panel, /Correct/);
  assert.match(panel, /Revoke/);
  assert.match(panel, /incident_content_links/);
  assert.match(reports, /published_accident_report_count/);
  assert.match(reports, /duplicate_of_report_id/);
  assert.match(tasks, /20261029100000_incident_content_links_review\.sql/);
});

test("canonical statistics keep unknown casualty values and exclude duplicate reports", async () => {
  const statistics = await read("src/lib/statistics.mjs");
  assert.match(statistics, /excludeLinkedDuplicates/);
  assert.match(statistics, /unknownFatalities/);
  assert.match(statistics, /unknownInjuries/);
});
