import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const retrieval = await readFile("src/lib/ai/retrieval.server.ts", "utf8");
const publicFunctions = await readFile("src/lib/ai/public.functions.ts", "utf8");
const providers = await readFile("src/lib/ai/providers.server.ts", "utf8");
const runtimeEnv = await readFile("src/lib/runtime-env.server.ts", "utf8");
const safe = await readFile("src/lib/ai/safe.ts", "utf8");
const migration = await readFile(
  "supabase/migrations/20260927120000_share_barabara_ai.sql",
  "utf8",
);

test("Public AI applies published Article filtering", () => {
  assert.match(retrieval, /from\("news"\)[\s\S]*?eq\("status", "published"\)/);
});

test("Public AI applies active Alert filtering", () => {
  assert.match(retrieval, /from\("alerts"\)[\s\S]*?eq\("status", "active"\)/);
});

test("Public AI applies approved Report filtering", () => {
  assert.match(retrieval, /from\("accident_reports"\)[\s\S]*?eq\("status", "approved"\)/);
});

test("AI evidence excludes private and editorial metadata", () => {
  assert.doesNotMatch(
    retrieval,
    /editor_note|rejection_reason|reviewed_by|reviewed_at|parties_involved/,
  );
  assert.doesNotMatch(retrieval, /select\("\*"\)/);
});

test("browser content blobs cannot override server context resolution", () => {
  assert.match(publicFunctions, /resolvePublicEvidence\(/);
  assert.doesNotMatch(publicFunctions, /value\[?["']body|value\[?["']evidence/);
});

test("chat requires authentication and Quick Summary remains public", () => {
  assert.match(
    publicFunctions,
    /export const publicAIChat[\s\S]*?middleware\(\[requireSupabaseAuth\]\)/,
  );
  assert.match(publicFunctions, /export const quickAISummary[\s\S]*?createServerFn/);
});

test("Public AI uses Groq and cannot invoke Editorial AI", () => {
  assert.match(publicFunctions, /completeWithProvider\("groq"/);
  assert.doesNotMatch(publicFunctions, /generateEditorialDraft|completeWithProvider\("grok"/);
});

test("Editorial routing keeps action-specific server-only providers", async () => {
  const editorial = await readFile("src/lib/ai/editorial.functions.ts", "utf8");
  assert.match(providers, /serverEnv\("GROQ_API_KEY"\)/);
  assert.match(providers, /serverEnv\("XAI_API_KEY"\)/);
  assert.match(editorial, /const provider = mode === "autopopulate" \? "groq" : "grok"/);
  assert.match(editorial, /completeWithProvider\(provider/);
  assert.match(runtimeEnv, /__env__/);
  assert.doesNotMatch(providers, /VITE_XAI_API_KEY/);
});

test("rate limiting supports a Cloudflare binding without embedding secrets", async () => {
  const rateLimit = await readFile("src/lib/ai/rate-limit.server.ts", "utf8");
  const wrangler = await readFile("wrangler.jsonc", "utf8");
  assert.match(rateLimit, /AI_RATE_LIMITER/);
  assert.match(rateLimit, /binding\.limit/);
  assert.doesNotMatch(rateLimit, /GROQ_API_KEY|XAI_API_KEY/);
  assert.match(wrangler, /"name": "AI_RATE_LIMITER"/);
  assert.match(wrangler, /"namespace_id": "1001"/);
  assert.match(wrangler, /"limit": 30/);
  assert.doesNotMatch(wrangler, /GROQ_API_KEY|XAI_API_KEY|VITE_/);
});

test("provider failures are returned without fabricated answers", () => {
  assert.match(providers, /if \(!response\.ok\)/);
  assert.match(providers, /provider_unavailable|not_configured/);
});

test("fabricated citation IDs cannot become trusted links", () => {
  assert.match(providers, /validateCitation\(item, index \+ 1\)/);
  assert.match(providers, /\.filter\(\(item\): item is TrustedCitation => !!item\)/);
});

test("citation URLs require safe HTTP(S) destinations", () => {
  assert.match(safe, /url\.protocol !== "https:" && url\.protocol !== "http:"/);
  assert.match(safe, /localhost|127\.0\.0\.1|192\.168\.|172\\\.\(1\[6-9\]/);
});

test("chat ownership is enforced by RLS and composite ownership constraints", () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ai_chat_messages_thread_user_fkey/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /WITH CHECK \([\s\S]*EXISTS \([\s\S]*t\.user_id = auth\.uid\(\)/);
});
