import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseEditorialDraftForTest, validateSourceGroundingForTest } from "../src/lib/ai/editorial.functions.ts";

const source = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const suppliedUrl =
  "https://www.kenyans.co.ke/news/128869-ntsa-seeks-details-drivers-viral-footage-dangerous-driving-nairobi-expressway";

const controlledReportSource = `${suppliedUrl}
Incident date: 2026-10-24
County: Nairobi
Road: Nairobi Expressway
Vehicles involved: 2
Injured: Unknown
Fatalities: Not confirmed
According to NTSA, officials are seeking details from drivers shown in viral footage.`;

test("the supplied production URL is treated as retrievable source evidence", async () => {
  const editorial = await source("src/lib/ai/editorial.functions.ts");
  assert.match(editorial, /resolveSourceMaterial\(source\)/);
  assert.match(editorial, /RETRIEVED SOURCE: \$\{url\.href\}/);
  assert.ok(controlledReportSource.includes(suppliedUrl));
});

test("source-grounding preserves exact dates, locations, numbers and unknown casualties", () => {
  const draft = {
    occurred_at: "2026-10-24T12:00:00.000Z",
    county: "Nairobi",
    road: "Nairobi Expressway",
    vehicles_involved: 2,
    casualties: null,
    fatalities: null,
  };
  assert.doesNotThrow(() => validateSourceGroundingForTest("report", controlledReportSource, draft));
  assert.throws(
    () => validateSourceGroundingForTest("report", controlledReportSource, { ...draft, vehicles_involved: 3 }),
    /does not match the source/,
  );
  assert.throws(
    () => validateSourceGroundingForTest("report", controlledReportSource, { ...draft, casualties: 0 }),
    /explicitly unknown/,
  );
});

test("valid structured Article output is not rejected because it exceeds the old truncation cap", () => {
  const body = "Verified source-grounded sentence. ".repeat(150);
  const answer = JSON.stringify({
    title: "NTSA seeks details on Nairobi Expressway driving footage",
    summary: "NTSA seeks details about drivers shown in Nairobi Expressway footage.",
    body,
    seo_title: "NTSA seeks details on Nairobi Expressway driving footage",
    seo_description: "NTSA is seeking details about drivers shown in viral Nairobi Expressway footage.",
    seo_keywords: "NTSA, Nairobi Expressway, dangerous driving",
  });
  assert.ok(answer.length > 5000);
  assert.equal(parseEditorialDraftForTest("article", answer).title, "NTSA seeks details on Nairobi Expressway driving footage");
});

test("provider configuration preserves full editorial JSON and uses extraction temperature", async () => {
  const providers = await source("src/lib/ai/providers.server.ts");
  const prompts = await source("src/lib/ai/editorial-prompts.ts");
  assert.match(providers, /input\.mode === "editorial" \? 16000 : MAX_OUTPUT_CHARS/);
  assert.match(providers, /input\.task === "extract" \? 0 : 0\.2/);
  assert.match(prompts, /EDITORIAL_EXTRACTION_PROMPTS/);
  assert.match(prompts, /Copy names, dates, places, numbers/);
});
