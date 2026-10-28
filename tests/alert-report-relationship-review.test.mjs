import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Alert-to-Report review records the fail-closed relationship boundary", async () => {
  const review = await read("docs/alert-report-relationship-review-20261028.md");
  const statistics = await read("src/routes/statistics.tsx");
  const duplicateMerge = await read("supabase/migrations/20261005120000_accident_duplicate_merge_review.sql");
  const suggestions = await read("supabase/migrations/20261006110000_incident_duplicate_suggestions_review.sql");

  assert.match(review, /BLOCKED pending a reviewed relationship model/);
  assert.match(review, /incident_content_links/);
  assert.match(review, /No database migration was created or executed/);
  assert.match(statistics, /Alerts are[\s\S]*not merged here/);
  assert.match(statistics, /duplicate_of_report_id/);
  assert.match(duplicateMerge, /Only editors can merge duplicate reports/);
  assert.match(duplicateMerge, /canonical_row\.status <> 'approved'/);
  assert.match(suggestions, /editors review incident duplicate suggestions/);
  assert.match(suggestions, /reviewed_by = auth\.uid\(\)/);
});
