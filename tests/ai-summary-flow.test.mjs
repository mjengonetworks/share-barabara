import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("content-scoped public AI remains grounded when the database resolver fails", () => {
  const source = read("src/lib/ai/public.functions.ts");
  assert.ok(source.includes("evidence = await resolvePublicEvidence"));
  assert.ok(source.includes("assessLocalEvidence(input.message, finalEvidence"));
  assert.ok(source.includes('input.contextType !== "general"'));
  assert.ok(source.includes('error: "insufficient_evidence"'));
});

test("published alert and report pages pass bounded page context to public AI", () => {
  assert.ok(read("src/routes/alerts.$alertId.tsx").includes("sourceText={`${alert.title}"));
  assert.ok(read("src/routes/reports.$reportId.tsx").includes("sourceText={`${report.title}"));
});

test("summary UI prevents duplicate requests and preserves the sign-in handoff", () => {
  const source = read("src/components/site/share-barabara-ai.tsx");
  assert.ok(source.includes("setBusy(true)"));
  assert.ok(source.includes("disabled={busy}"));
  assert.ok(source.includes("Sign in to Chat"));
  assert.ok(source.includes('aiReturnTo("content")'));
  assert.ok(source.includes('focusAISurface("share-barabara-ai")'));
  assert.ok(source.includes("authLoading"));
  assert.ok(source.includes("user && !authLoading"));
  assert.ok(source.includes("Continue Chatting"));
  assert.ok(source.includes("Sign in to ask follow-up questions about this content."));
  assert.ok(source.includes("<Button asChild"));
  assert.ok(source.includes("summaryRequested"));
  assert.ok(source.includes('window.location.hash !== "#share-barabara-ai"'));
  assert.ok(source.includes("EvidenceLinks"));
  assert.ok(source.includes("EXTERNAL_RESEARCH_UNAVAILABLE"));
  assert.ok(source.includes("evidence: result.evidence"));
});

test("contextual continuation restores the same published context after auth", () => {
  const source = read("src/components/site/share-barabara-ai.tsx");
  assert.match(source, /contextType, contextId/);
  assert.ok(source.includes("sourceText ? { sourceText } : {}"));
  assert.match(source, /aiReturnTo\("content"\)/);
  assert.match(source, /focusAISurface\("share-barabara-ai"\)/);
});

test("external retrieval stays explicitly unavailable while SearXNG is pending", () => {
  const source = read("src/components/site/share-barabara-ai.tsx");
  assert.match(source, /This question requires information beyond Share Barabara's available reports/);
  assert.match(source, /wider web-search capability is being finalized/);
});

test("editorial provider mapping remains action-specific", () => {
  const source = read("src/lib/ai/editorial.functions.ts");
  assert.ok(source.includes('mode === "autopopulate" ? "groq" : "grok"'));
  assert.ok(source.includes("generateEditorialDraft = createServerFn"));
  assert.ok(source.includes("requireSupabaseAuth"));
});

test("return-to validation rejects external and auth destinations", () => {
  const source = read("src/lib/ai/return-to-ai.ts");
  assert.ok(source.includes('value.startsWith("/")'));
  assert.ok(source.includes('value.startsWith("//")'));
  assert.ok(source.includes('url.pathname === "/auth"'));
});

test("Quick AI returns a plain structured error instead of throwing to Worker serialization", () => {
  const source = read("src/lib/ai/public.functions.ts");
  assert.match(source, /export function normalizePublicAIResult/);
  assert.match(source, /function publicAIExceptionResult/);
  assert.match(source, /try \{[\s\S]*const input = validate\(data\)/);
  assert.match(source, /return publicAIExceptionResult\(error\)/);
  assert.match(source, /return normalizePublicAIResult\(await runPublicAI/);
});
