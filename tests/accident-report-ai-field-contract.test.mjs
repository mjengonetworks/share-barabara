import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAccidentReportAiObject, mapAccidentReportAiDraftToForm } from "../src/lib/ai/accident-report-contract.ts";
import { filterControlledDraftValues, parseEditorialDraftForTest } from "../src/lib/ai/editorial.functions.ts";
import { readFile } from "node:fs/promises";

test("Accident Report AI aliases map to the existing CMS contract", () => {
  const result = normalizeAccidentReportAiObject({
    title: "Two vehicles collide on Mombasa Road",
    editorial_summary: "Police confirmed two injuries.",
    body: "The incident was reported near Nairobi.",
    county: "Nairobi",
    location: "Mombasa Road",
    incident_date_time: "2026-11-12T08:30:00Z",
    confirmed_injuries: 2,
    confirmed_fatalities: null,
    road_user_categories: ["Passenger", "motorcyclist"],
    latitude: -1.2921,
    longitude: 36.8219,
    imageAlt: "Two vehicles at the roadside",
  });
  assert.equal(result.draft.description, "The incident was reported near Nairobi.");
  assert.equal(result.draft.summary, "Police confirmed two injuries.");
  assert.equal(result.draft.road, "Mombasa Road");
  assert.equal(result.draft.casualties, 2);
  assert.equal(result.draft.fatalities, null);
  assert.deepEqual(result.draft.parties_involved, ["passenger", "motorcyclist"]);
  assert.equal(result.draft.latitude, -1.2921);
  assert.equal(result.draft.image_alt, "Two vehicles at the roadside");
  assert.ok(result.results.skipped.includes("fatalities"));
});

test("unknown counts stay unknown while confirmed zero remains zero", () => {
  const result = normalizeAccidentReportAiObject({
    title: "Report",
    casualties: "not confirmed",
    fatalities: 0,
    vehicles_involved: null,
  });
  assert.equal(result.draft.casualties, undefined);
  assert.equal(result.draft.fatalities, 0);
  assert.equal(result.draft.vehicles_involved, null);
  assert.ok(result.results.skipped.includes("casualties"));
});

test("invalid fields are rejected without discarding valid generated fields", () => {
  const result = normalizeAccidentReportAiObject({
    title: "Verified title",
    description: "Verified narrative",
    summary: "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty one",
    latitude: 300,
    parties_involved: ["driver"],
  });
  assert.equal(result.draft.title, "Verified title");
  assert.equal(result.draft.description, "Verified narrative");
  assert.equal(result.draft.summary, undefined);
  assert.match(result.results.rejected.summary, /20 words/);
  assert.match(result.results.rejected.latitude, /coordinate/);
  assert.match(result.results.rejected.parties_involved, /supported/);
});

test("active taxonomy rejection is field-level", () => {
  const result = filterControlledDraftValues("report", {
    title: "Verified title",
    description: "Verified narrative",
    incident_type: "invented-type",
    severity: "fatal",
  }, { hazardTypes: ["collision"], severities: ["serious"] });
  assert.equal(result.draft.title, "Verified title");
  assert.equal(result.draft.description, "Verified narrative");
  assert.equal(result.draft.incident_type, undefined);
  assert.equal(result.draft.severity, undefined);
  assert.deepEqual(Object.keys(result.rejected).sort(), ["incident_type", "severity"]);
});

test("the canonical full-content field maps to both editor form shapes", () => {
  assert.deepEqual(mapAccidentReportAiDraftToForm({ description: "Full content", casualties: null }, "body"), { body: "Full content", casualties: null });
  assert.deepEqual(mapAccidentReportAiDraftToForm({ body: "Full content", road_user_categories: ["passenger"] }, "description"), { description: "Full content", parties_involved: ["passenger"] });
  const parsed = parseEditorialDraftForTest("report", JSON.stringify({ body: "Full content", confirmed_injuries: 3, confirmed_fatalities: null }));
  assert.equal(parsed.description, "Full content");
  assert.equal(parsed.casualties, 3);
});

test("responsive Reports listing keeps actions visible without a fixed overflow width", async () => {
  const source = await readFile(new URL("../src/routes/_authenticated/admin/reports.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /REPORT_LISTING_GRID = "[^"]*min-w-\[1180px\]/);
  assert.match(source, /grid-cols-\[24px_48px_minmax\(0,1fr\)_auto\]/);
  assert.match(source, /min-w-\[9rem\].*whitespace-nowrap/);
  assert.match(source, /hidden md:block.*Location/);
});
