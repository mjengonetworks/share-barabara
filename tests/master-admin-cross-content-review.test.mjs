import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("master admin review keeps the current content-type form boundaries", () => {
  const article = read("src/components/site/article-form.tsx");
  const report = read("src/components/site/report-form.tsx");
  assert.doesNotMatch(article, /fatalities|casualties|vehicles_involved|incident_type/);
  assert.match(report, /contentType="report"/);
  assert.match(report, /provider: "groq"/);
  assert.match(report, /provider: "grok"/);
  assert.match(report, /id="r-title"/);
  assert.ok(report.indexOf("const editorialAiControls") < report.indexOf('id="r-title"'));
});

test("cross-content persistence is review-only and has explicit security seams", () => {
  const proposal = read("supabase/inspection/cross-content-relationships-proposal.sql");
  assert.match(proposal, /REVIEW ONLY/);
  assert.match(proposal, /rollback;/);
  assert.match(proposal, /editorial_tags/);
  assert.match(proposal, /editorial_content_relationships/);
  assert.match(proposal, /has_min_role\(auth\.uid\(\), 'editor'\)/);
  assert.match(proposal, /published\/approved/);
  assert.match(proposal, /intentionally outside supabase\/migrations/);
});

test("mobile header correction remains in the deployed integration", () => {
  const header = read("src/components/site/site-header.tsx");
  assert.match(header, /items-center gap-1 px-1\.5/);
});
