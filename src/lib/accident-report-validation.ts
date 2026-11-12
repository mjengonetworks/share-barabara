export type ReportValidationMode = "draft" | "publish";

export type ReportValidationInput = {
  title?: unknown;
  description?: unknown;
  county?: unknown;
  severity?: unknown;
  occurred_at?: unknown;
  vehicles_involved?: unknown;
  casualties?: unknown;
  fatalities?: unknown;
};

export type ReportFieldErrors = Record<string, string>;

export type ReportValidationResult = {
  code: string;
  message: string;
  fields: ReportFieldErrors;
} | null;

function blank(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

function validTimestamp(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function validCount(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0)
  );
}

export function validateAccidentReportFields(
  input: ReportValidationInput,
  mode: ReportValidationMode,
): ReportValidationResult {
  const fields: ReportFieldErrors = {};
  if (blank(input.title)) fields.title = "Enter a report title.";
  if (blank(input.description)) fields.description = "Enter an incident description.";
  if (blank(input.county)) fields.county = "Select or enter the incident county.";

  if (mode === "publish") {
    if (blank(input.severity)) fields.severity = "Select an incident severity before publishing.";
    if (blank(input.occurred_at))
      fields.occurred_at = "Enter the incident date and time before publishing.";
  } else if (input.severity !== undefined && !blank(input.severity)) {
    // Drafts may omit publication fields, but supplied values still need to be valid.
    if (typeof input.severity !== "string") fields.severity = "Select a valid incident severity.";
  }

  if (
    input.occurred_at !== undefined &&
    !blank(input.occurred_at) &&
    !validTimestamp(input.occurred_at)
  ) {
    fields.occurred_at = "Enter a valid incident date and time.";
  }
  if (!validCount(input.vehicles_involved))
    fields.vehicles_involved = "Use a whole number or leave this value unknown.";
  if (!validCount(input.casualties))
    fields.casualties = "Use a whole number or leave this value unknown.";
  if (!validCount(input.fatalities))
    fields.fatalities = "Use a whole number or leave this value unknown.";

  const keys = Object.keys(fields);
  if (!keys.length) return null;
  const first = keys[0];
  const singleCodes: Record<string, string> = {
    title: "TITLE_REQUIRED",
    description: "DESCRIPTION_REQUIRED",
    county: "COUNTY_REQUIRED",
    severity: "SEVERITY_REQUIRED",
    occurred_at: "OCCURRED_AT_REQUIRED",
    vehicles_involved: "VEHICLES_INVALID",
    casualties: "CASUALTIES_INVALID",
    fatalities: "FATALITIES_INVALID",
  };
  return {
    code: keys.length === 1 ? singleCodes[first] : "REPORT_FIELDS_INVALID",
    message: "Review the highlighted report fields.",
    fields,
  };
}
