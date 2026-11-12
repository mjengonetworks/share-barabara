import assert from "node:assert/strict";
import test from "node:test";
import { validateAccidentReportFields } from "../src/lib/accident-report-validation.ts";
import { handleAccidentReportApi } from "../src/lib/accident-report-persistence.server.ts";

function mutation(overrides = {}) {
  return {
    title: "A report",
    description: "A confirmed incident",
    county: "Nairobi",
    road: "Mombasa Road",
    severity: "moderate",
    occurred_at: "2026-11-12T09:30:00.000Z",
    vehicles_involved: null,
    casualties: null,
    fatalities: null,
    latitude: null,
    longitude: null,
    image_url: null,
    image_alt: null,
    image_caption: null,
    image_credit: null,
    road_id: null,
    parties_involved: [],
    casualty_breakdown: {},
    attachments: [],
    page_id: null,
    is_anonymous: false,
    ...overrides,
  };
}

async function postApi(body) {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_URL = "https://supabase.example.test";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  try {
    return await handleAccidentReportApi(new Request("https://example.test/api/admin/accident-reports", {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "11111111-1111-4111-8111-111111111112" },
      body: JSON.stringify(body),
    }));
  } finally {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
    else process.env.SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
}

const base = {
  title: "A report",
  description: "A confirmed incident",
  county: "Nairobi",
  severity: "moderate",
  occurred_at: "2026-11-12T09:30",
  vehicles_involved: null,
  casualties: null,
  fatalities: null,
};

test("draft validation does not require publication-only severity or occurrence time", () => {
  const result = validateAccidentReportFields({ ...base, severity: "", occurred_at: "" }, "draft");
  assert.equal(result, null);
});

test("publish validation requires severity and occurrence time", () => {
  const result = validateAccidentReportFields(
    { ...base, severity: "", occurred_at: "" },
    "publish",
  );
  assert.equal(result?.code, "REPORT_FIELDS_INVALID");
  assert.equal(result?.fields.severity, "Select an incident severity before publishing.");
  assert.equal(result?.fields.occurred_at, "Enter the incident date and time before publishing.");
});

test("unknown casualty and injury values remain valid nulls", () => {
  const result = validateAccidentReportFields(base, "publish");
  assert.equal(result, null);
});

test("invalid dates and negative counts return field-level errors", () => {
  const result = validateAccidentReportFields(
    { ...base, occurred_at: "not-a-date", casualties: -1 },
    "publish",
  );
  assert.equal(result?.fields.occurred_at, "Enter a valid incident date and time.");
  assert.equal(result?.fields.casualties, "Use a whole number or leave this value unknown.");
});

test("draft request passes shared validation and reaches the authenticated POST contract without publication-only fields", async () => {
  const response = await postApi(mutation({ requestedStatus: "draft", severity: "", occurred_at: "" }));
  const result = await response.json();
  assert.equal(response.status, 401);
  assert.equal(result.error.code, "AUTHENTICATION_FAILED");
  assert.notEqual(result.error.code, "REPORT_FIELDS_INVALID");
});

test("publish request reaches the same POST contract with publication fields and null unknown counts", async () => {
  const response = await postApi(mutation({ requestedStatus: "approved" }));
  const result = await response.json();
  assert.equal(response.status, 401);
  assert.equal(result.error.code, "AUTHENTICATION_FAILED");
  assert.notEqual(result.error.code, "REPORT_FIELDS_INVALID");
});
