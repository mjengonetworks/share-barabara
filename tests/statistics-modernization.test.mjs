import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isApprovedReport,
  percentageChange,
  reportMonthBuckets,
  sumKnown,
} from "../src/lib/statistics.mjs";

test("approved reports are a separate public dataset", () => {
  assert.equal(isApprovedReport({ status: "approved" }), true);
  assert.equal(isApprovedReport({ status: "pending" }), false);
  assert.equal(isApprovedReport({ status: "rejected" }), false);
});

test("NULL report counts remain unknown and are not converted to zero", () => {
  assert.deepEqual(sumKnown([2, null, 0]), { value: 2, hasUnknown: true });
  assert.deepEqual(sumKnown([null]), { value: 0, hasUnknown: true });
});

test("the public route does not coerce missing casualty-breakdown values to zero", async () => {
  const source = await readFile(new URL("../src/routes/statistics.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /c\.dead \?\? 0/);
  assert.doesNotMatch(source, /c\.injured \?\? 0/);
  assert.match(source, /\+ unknown/);
});

test("fatalities and injuries retain separate semantics in monthly buckets", () => {
  const buckets = reportMonthBuckets(
    [
      { occurred_at: "2026-01-03T00:00:00Z", fatalities: 1, casualties: 3 },
      { occurred_at: "2026-01-18T00:00:00Z", fatalities: null, casualties: 0 },
    ],
    2026,
  );
  assert.deepEqual(buckets[0].fatalities, { value: 1, hasUnknown: true });
  assert.deepEqual(buckets[0].injuries, { value: 3, hasUnknown: false });
  assert.equal(buckets[1].reports, 0);
});

test("period comparisons do not manufacture a percentage from a zero baseline", () => {
  assert.equal(percentageChange(4, 0), null);
  assert.equal(percentageChange(6, 4), 50);
});

test("public route explicitly separates approved reports from stored aggregates", async () => {
  const source = await readFile(new URL("../src/routes/statistics.tsx", import.meta.url), "utf8");
  assert.match(source, /\.eq\("status", "approved"\)/);
  assert.match(source, /not Kenya's official national road-safety total/);
  assert.doesNotMatch(source, /2026\s*[,)]\s*\d/);
  assert.doesNotMatch(source, /searx/i);
});

test("provenance schema is review-only and cannot autonomously publish", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/20260930100000_statistics_modernization_review.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /REVIEW-ONLY/);
  assert.match(sql, /statistics_update_proposals/);
  assert.match(sql, /publication_status = 'published'/);
  assert.match(sql, /record_status = 'published'/);
  assert.match(sql, /source_published_at IS NOT NULL/);
  assert.match(sql, /COALESCE\(geography, ''\)/);
  assert.match(sql, /period_kind.*annual.*monthly.*date_range.*point_in_time/s);
  assert.match(sql, /record_status.*superseded/);
  assert.match(sql, /Published statistics observations are immutable/);
  assert.match(sql, /Statistics proposal author is immutable/);
  assert.match(sql, /Reviewed statistics proposals are immutable/);
  assert.match(sql, /verification_status.*unverified.*provisional.*final/s);
  assert.match(sql, /record_status <> 'published' OR verification_status IN \('provisional', 'final'\)/);
  assert.match(sql, /has_min_role\(auth\.uid\(\), 'editor'\)/);
  assert.match(sql, /proposed_by = auth\.uid\(\)/);
  assert.doesNotMatch(sql, /ON public\.statistics_update_proposals FOR DELETE/);
  assert.doesNotMatch(sql, /ON DELETE CASCADE/);
  assert.doesNotMatch(sql, /INSERT INTO public\.statistics_(datasets|observations)/);
});

test("legacy and current-year language does not claim verified official data", async () => {
  const source = await readFile(new URL("../src/routes/statistics.tsx", import.meta.url), "utf8");
  assert.match(source, /legacy stored aggregate records/);
  assert.match(source, /not presented as confirmed official or government statistics/);
  assert.match(source, /approved Share Barabara reports/);
  assert.doesNotMatch(source, /official-source figures/);
  assert.doesNotMatch(source, /verified accident reports/);
});

test("alerts keep their existing active/public semantics while reports require approval", async () => {
  const source = await readFile(new URL("../src/routes/statistics.tsx", import.meta.url), "utf8");
  assert.match(source, /useLiveCount\("alerts", "alerts"\)/);
  assert.match(source, /supabase\.from\("alerts"\)\.select\("casualty_breakdown"\)/);
  assert.match(source, /supabase\.from\("accident_reports"\)\.select\("casualty_breakdown"\)\.eq\("status", "approved"\)/);
});

test("the runtime page preserves legacy tables and optionally reads published provenance", async () => {
  const source = await readFile(new URL("../src/routes/statistics.tsx", import.meta.url), "utf8");
  assert.match(source, /statistics_datasets/);
  assert.match(source, /yearly_stats/);
  assert.match(source, /No published external datasets are available yet/);
});

test("statistics admin has review-only evidence proposals", async () => {
  const [admin, panel, migration] = await Promise.all([
    readFile(new URL("../src/routes/_authenticated/admin/crash-statistics.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/site/statistics-proposals-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260930100000_statistics_modernization_review.sql", import.meta.url), "utf8"),
  ]);
  assert.match(admin, /StatisticsProposalsPanel/);
  assert.match(panel, /statistics_update_proposals/);
  assert.match(panel, /Accepted proposals do not publish or alter statistics automatically/);
  assert.match(panel, /JSON\.parse/);
  assert.match(panel, /eq\("status", "pending"\)/);
  assert.match(migration, /statistics_proposals_editor_update/);
});
