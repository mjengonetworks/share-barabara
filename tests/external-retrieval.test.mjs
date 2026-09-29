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
  assert.match(external, /selected === "searxng"/);
  assert.match(external, /SEARXNG_BASE_URL/);
  assert.match(external, /external_search_unavailable/);
  assert.doesNotMatch(external, /VITE_TAVILY_API_KEY|VITE_EXA_API_KEY/);
});

test("SearXNG uses the server-side JSON API and supported search parameters", () => {
  assert.match(external, /format.*json/);
  assert.match(external, /url\.searchParams\.set\("q"/);
  assert.match(external, /language/);
  assert.match(external, /categories/);
  assert.match(external, /safesearch/);
  assert.match(external, /time_range/);
  assert.match(external, /SEARXNG_AUTH_TOKEN/);
  assert.doesNotMatch(external, /VITE_SEARXNG/);
});

test("SearXNG results are normalized safely and duplicate destinations are merged", () => {
  assert.match(external, /normalizedDestination/);
  assert.match(external, /byDestination/);
  assert.match(external, /value\.content \?\? value\.snippet/);
  assert.match(external, /value\.engines/);
  assert.match(external, /sourceId: `source_\$\{index \+ 1\}`/);
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
  assert.match(external, /administrator-controlled service configuration/);
  assert.match(external, /url\.protocol !== "https:" && url\.protocol !== "http:"/);
});

test("external failures remain distinct and rate limited", async () => {
  assert.match(publicAI, /external_search_rate_limited/);
  assert.match(publicAI, /external\.status/);
  assert.match(external, /external_search_rate_limited/);
  assert.match(external, /AbortController/);
  const rateLimit = await readFile("src/lib/ai/rate-limit.server.ts", "utf8");
  assert.match(rateLimit, /external: 10/);
});

test("provider seams and local-first flow remain intact", () => {
  assert.match(external, /selected === "tavily"/);
  assert.match(external, /selected === "exa"/);
  assert.match(publicAI, /if \(!localAssessment\.sufficient\)/);
  assert.match(publicAI, /searchExternal\(/);
  assert.match(publicAI, /completeWithProvider\("groq"/);
});

test("citations use original destinations and engine metadata stays internal", () => {
  assert.match(external, /validateCitation\(\{ title: source\.title, url: source\.url/);
  assert.match(external, /providerMetadata/);
  assert.match(external, /sourceName: url\.hostname/);
  assert.doesNotMatch(publicAI, /SEARXNG_BASE_URL|SEARXNG_AUTH_TOKEN/);
});
