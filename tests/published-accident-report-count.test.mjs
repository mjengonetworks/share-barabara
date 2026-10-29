import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20261029130000_published_accident_report_count_deleted_filter_review.sql";

const isPublishedEligible = (report) =>
  report.status === "approved" &&
  report.duplicate_of_report_id == null &&
  report.deleted_at == null;

test("the corrective migration preserves the RPC security contract and excludes soft-deleted reports", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.published_accident_report_count\(\)/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = public/);
  assert.match(sql, /status = 'approved'/);
  assert.match(sql, /duplicate_of_report_id IS NULL/);
  assert.match(sql, /deleted_at IS NULL/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.published_accident_report_count\(\) FROM PUBLIC/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.published_accident_report_count\(\) TO anon, authenticated, service_role/);
});

test("published count and canonical eligibility agree across published, unpublished, deleted, duplicate and unknown-casualty records", () => {
  const reports = [
    { id: "published-known", status: "approved", duplicate_of_report_id: null, deleted_at: null, fatalities: 1, casualties: 2 },
    { id: "published-unknown", status: "approved", duplicate_of_report_id: null, deleted_at: null, fatalities: null, casualties: null },
    { id: "unpublished", status: "pending", duplicate_of_report_id: null, deleted_at: null, fatalities: 2, casualties: 3 },
    { id: "soft-deleted", status: "approved", duplicate_of_report_id: null, deleted_at: "2026-10-29T12:00:00Z", fatalities: 4, casualties: 5 },
    { id: "duplicate", status: "approved", duplicate_of_report_id: "published-known", deleted_at: null, fatalities: 6, casualties: 7 },
  ];

  const eligible = reports.filter(isPublishedEligible);
  const canonical = reports.filter(isPublishedEligible);

  assert.deepEqual(eligible.map(({ id }) => id), ["published-known", "published-unknown"]);
  assert.equal(eligible.length, 2);
  assert.equal(canonical.length, eligible.length);
  assert.equal(eligible.find((report) => report.id === "published-unknown").fatalities, null);
  assert.equal(eligible.find((report) => report.id === "published-unknown").casualties, null);
});
