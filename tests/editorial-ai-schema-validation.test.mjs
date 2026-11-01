import assert from "node:assert/strict";
import test from "node:test";
import { parseEditorialDraftForTest } from "../src/lib/ai/editorial.functions.ts";

const drafts = {
  article: { title: "Verified article", summary: "A short verified summary", body: "Verified body", category: null, seo_title: null, seo_description: null, seo_keywords: null, image_alt: null, image_caption: null, image_credit: null },
  alert: { title: "Road hazard", description: "A verified road hazard", county: "Nairobi", road: "Mombasa Road", hazard_type: null, severity: null, parties_involved: null },
  report: { title: "Collision reported", description: "A verified collision", county: "Nairobi", road: "Mombasa Road", incident_type: null, severity: null, occurred_at: "2026-10-31T08:30:00Z", vehicles_involved: null, casualties: null, fatalities: null, parties_involved: null, seo_title: null, seo_description: null, seo_keywords: null, image_alt: null, image_caption: null, image_credit: null },
  campaign: { title: "Road safety campaign", location: "Nairobi", description: "Verified campaign details", start_date: "2026-11-01T00:00:00Z", end_date: "2026-11-30", },
  infrastructure: { title: "Bridge works", road_name: "A104", county: "Nairobi", authority: "KeNHA", structure_type: null, summary: "Verified summary", content: "Verified content", editor_note: null },
};

test("valid structured responses normalize every CMS content type without inventing fields", () => {
  for (const [contentType, draft] of Object.entries(drafts)) {
    const parsed = parseEditorialDraftForTest(contentType, JSON.stringify(draft));
    assert.equal(parsed.title, draft.title, contentType);
    assert.ok(!Object.hasOwn(parsed, "status"), `${contentType}: status must never be proposed`);
  }
  const campaign = parseEditorialDraftForTest("campaign", JSON.stringify(drafts.campaign));
  assert.equal(campaign.start_date, "2026-11-01");
  const report = parseEditorialDraftForTest("report", JSON.stringify(drafts.report));
  assert.equal(report.occurred_at, "2026-10-31T08:30:00.000Z");
});

test("null and partial values remain distinguishable from confirmed zero", () => {
  const parsed = parseEditorialDraftForTest("report", JSON.stringify({ title: "Report", casualties: null, fatalities: 0 }));
  assert.equal(parsed.casualties, null);
  assert.equal(parsed.fatalities, 0);
  assert.equal(parsed.vehicles_involved, undefined);
});

test("invalid date fields identify the exact field and rule", () => {
  assert.throws(
    () => parseEditorialDraftForTest("campaign", JSON.stringify({ title: "Campaign", start_date: "31/11/2026" })),
    /start_date: expected an ISO calendar date/,
  );
  assert.throws(
    () => parseEditorialDraftForTest("report", JSON.stringify({ title: "Report", occurred_at: "not a date" })),
    /occurred_at: expected an ISO date or datetime/,
  );
});

test("provider output with no usable supported fields fails closed", () => {
  assert.throws(() => parseEditorialDraftForTest("alert", JSON.stringify({ status: "published" })), /no usable fields/);
});
