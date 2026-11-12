import { normalizeRichTextForEditor } from "@/lib/rich-text-format";

/**
 * Canonical Accident Report AI contract.
 *
 * The provider uses these names; the CMS maps `description` to its visible
 * Full content editor field. Aliases are accepted only at the provider
 * boundary so persistence continues to use the existing database columns.
 */
export const ACCIDENT_REPORT_AI_FIELDS = [
  "title",
  "summary",
  "description",
  "county",
  "road",
  "incident_type",
  "severity",
  "occurred_at",
  "latitude",
  "longitude",
  "vehicles_involved",
  "casualties",
  "fatalities",
  "parties_involved",
  "seo_title",
  "seo_description",
  "seo_keywords",
  "image_alt",
  "image_caption",
  "image_credit",
] as const;
export const RECOMMENDED_SEO_DESCRIPTION_CHARS = 160;

export type AccidentReportAiField = (typeof ACCIDENT_REPORT_AI_FIELDS)[number];
export type AccidentReportAiValue = string | number | null | string[];
export type AccidentReportAiDraft = Partial<Record<AccidentReportAiField, AccidentReportAiValue>>;

export type AccidentReportAiFieldResults = {
  populated: string[];
  skipped: string[];
  rejected: Record<string, string>;
  skippedReasons: Record<string, string>;
  warnings: Record<string, string>;
};

const FIELD_ALIASES: Record<string, AccidentReportAiField> = {
  body: "description",
  full_content: "description",
  fullContent: "description",
  editorial_summary: "summary",
  editorialSummary: "summary",
  location: "road",
  road_location: "road",
  roadLocation: "road",
  incident_date_time: "occurred_at",
  incidentDateTime: "occurred_at",
  confirmed_injuries: "casualties",
  confirmedInjuries: "casualties",
  confirmed_fatalities: "fatalities",
  confirmedFatalities: "fatalities",
  road_user_categories: "parties_involved",
  roadUserCategories: "parties_involved",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
  seoKeywords: "seo_keywords",
  imageAlt: "image_alt",
  imageCaption: "image_caption",
  imageCredit: "image_credit",
};

const INTEGER_FIELDS = new Set(["vehicles_involved", "casualties", "fatalities"]);
const COORDINATE_FIELDS = new Set(["latitude", "longitude"]);
const UNKNOWN_NUMBER = /^(unknown|not confirmed|not reported|unspecified|n\/a|none stated|not available)$/i;
const PARTY_VALUES = new Map([
  ["pedestrian", "pedestrian"],
  ["cyclist", "cyclist"],
  ["motorcyclist", "motorcyclist"],
  ["passenger", "passenger"],
  ["other", "other"],
]);

function canonicalField(key: string) {
  return (ACCIDENT_REPORT_AI_FIELDS as readonly string[]).includes(key)
    ? key as AccidentReportAiField
    : FIELD_ALIASES[key];
}

function numberValue(field: string, value: unknown) {
  if (value === null || value === undefined) return { value: null as null, skipped: true };
  if (typeof value === "string" && UNKNOWN_NUMBER.test(value.trim())) return { value: null as null, skipped: true };
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isInteger(number) || number < 0) return { invalid: `${field} must be a whole number or remain unknown.` };
  return { value: number };
}

function coordinateValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return { value: null as null, skipped: true };
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  const validRange = field === "latitude" ? number >= -90 && number <= 90 : number >= -180 && number <= 180;
  if (!Number.isFinite(number) || !validRange) return { invalid: `${field} must be a verified coordinate or remain blank.` };
  return { value: number };
}

function occurredValue(value: unknown) {
  if (value === null || value === undefined || value === "") return { value: null as null, skipped: true };
  if (typeof value !== "string") return { invalid: "occurred_at must be a date or datetime supported by the CMS." };
  const trimmed = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return { invalid: "occurred_at must be a valid date or datetime." };
  return { value: parsed.toISOString() };
}

function partiesValue(value: unknown) {
  if (value === null || value === undefined || value === "") return { value: null as null, skipped: true };
  if (!Array.isArray(value)) return { invalid: "parties_involved must use the supported road-user categories." };
  const mapped = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => PARTY_VALUES.get(item.trim().toLocaleLowerCase()))
    .filter((item): item is string => Boolean(item));
  if (!mapped.length && value.length) return { invalid: "parties_involved contains no supported road-user category." };
  return { value: [...new Set(mapped)] };
}

function textValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return { value: null as null, skipped: true };
  if (typeof value !== "string" && typeof value !== "number") return { invalid: `${field} must be text or remain blank.` };
  const text = field === "description" ? normalizeRichTextForEditor(String(value)) : String(value).trim();
  if (!text) return { value: null as null, skipped: true };
  if (field === "summary" && text.split(/\s+/).filter(Boolean).length > 20) return { invalid: "summary must contain no more than 20 words." };
  if (field === "seo_description" && text.length > RECOMMENDED_SEO_DESCRIPTION_CHARS) {
    return { value: text, warning: `Longer than the recommended ${RECOMMENDED_SEO_DESCRIPTION_CHARS} characters; review before saving.` };
  }
  if (field === "seo_keywords" && text.length > 500) return { invalid: "seo_keywords must be 500 characters or fewer." };
  return { value: text };
}

/** Normalize provider aliases, reject invalid values field-by-field, and keep valid fields. */
export function normalizeAccidentReportAiObject(input: Record<string, unknown>): {
  draft: AccidentReportAiDraft;
  results: AccidentReportAiFieldResults;
} {
  const draft: AccidentReportAiDraft = {};
  const rejected: Record<string, string> = {};
  const skippedReasons: Record<string, string> = {};
  const warnings: Record<string, string> = {};
  const skipped = new Set<string>();
  for (const [rawField, rawValue] of Object.entries(input)) {
    const field = canonicalField(rawField);
    if (!field || field in draft) continue;
    const result = INTEGER_FIELDS.has(field)
      ? numberValue(field, rawValue)
      : COORDINATE_FIELDS.has(field)
        ? coordinateValue(field, rawValue)
        : field === "occurred_at"
          ? occurredValue(rawValue)
          : field === "parties_involved"
            ? partiesValue(rawValue)
            : textValue(field, rawValue);
    if ("invalid" in result) {
      rejected[field] = result.invalid;
    } else if (result.skipped || result.value === null) {
      if (rawValue === null) draft[field] = null;
      skipped.add(field);
      skippedReasons[field] = rawValue === null ? "The provider marked this value as unknown or unverified." : "No usable value was returned.";
    } else {
      draft[field] = result.value as AccidentReportAiValue;
      if ("warning" in result && result.warning) warnings[field] = result.warning;
    }
  }
  const populated = Object.keys(draft);
  for (const field of ACCIDENT_REPORT_AI_FIELDS) {
    if (!populated.includes(field) && !rejected[field]) {
      skipped.add(field);
      skippedReasons[field] ??= "The provider did not return this field.";
    }
  }
  return { draft, results: { populated, skipped: [...skipped], rejected, skippedReasons, warnings } };
}

/** Map the canonical database contract to the visible editor field names. */
export function mapAccidentReportAiDraftToForm(
  draft: Record<string, unknown>,
  contentField: "body" | "description" = "body",
) {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    const field = canonicalField(key) ?? key;
    if (field === "description") next[contentField] = value;
    else if (field === "parties_involved") next["parties_involved"] = value;
    else next[field] = value;
  }
  return next;
}
