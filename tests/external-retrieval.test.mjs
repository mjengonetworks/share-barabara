import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const external = await readFile("src/lib/ai/external.server.ts", "utf8");
const retrieval = await readFile("src/lib/ai/retrieval.server.ts", "utf8");
const publicAI = await readFile("src/lib/ai/public.functions.ts", "utf8");
const providers = await readFile("src/lib/ai/providers.server.ts", "utf8");
const safe = await readFile("src/lib/ai/safe.ts", "utf8");

test("public retrieval is local-first and has a deterministic sufficiency gate", () => {
  assert.match(publicAI, /assessLocalEvidence\(/);
  assert.match(publicAI, /if \(!localAssessment\.sufficient\)/);
  assert.match(retrieval, /CURRENT_SIGNAL/);
  assert.match(retrieval, /direct_context/);
});

test("external search is provider-neutral and fail-closed", () => {
  assert.match(external, /EXTERNAL_SEARCH_PROVIDER/);
  assert.match(external, /interface ExternalSearchProvider/);
  assert.match(external, /external_search_unavailable/);
  assert.doesNotMatch(external, /VITE_TAVILY_API_KEY|VITE_EXA_API_KEY/);
});

test("external sources are untrusted and citations are server-owned", () => {
  assert.match(external, /UNTRUSTED EXTERNAL SOURCE EVIDENCE/);
  assert.match(providers, /source IDs such as \[source_1\]/);
  assert.match(providers, /citationIds/);
  assert.match(publicAI, /externalCitations\.filter/);
});

test("retrieval applies source trust, query bounds, and URL rejection", () => {
  assert.match(external, /social_or_user_generated/);
  assert.match(external, /MAX_QUERY_LENGTH/);
  assert.match(external, /blockedDomains/);
  assert.match(external, /url\.username \|\| url\.password/);
  assert.match(safe, /isPrivateIp/);
});

test("external failures remain distinct and rate limited", async () => {
  assert.match(publicAI, /external_search_rate_limited/);
  assert.match(publicAI, /external\.status/);
  const rateLimit = await readFile("src/lib/ai/rate-limit.server.ts", "utf8");
  assert.match(rateLimit, /external: 10/);
});
