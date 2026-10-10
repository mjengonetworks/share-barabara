import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("editorial AI is absent from public accident and alert submission forms", async () => {
  const [report, alert] = await Promise.all([
    read("src/components/site/report-form.tsx"),
    read("src/components/site/alert-form.tsx"),
  ]);
  assert.doesNotMatch(report, /EditorialAIButton|generateEditorialDraft|Auto-Populate|Update Existing/i);
  assert.doesNotMatch(alert, /EditorialAIButton|generateEditorialDraft|Auto-Populate|Update Existing/i);
});

test("editorial AI remains available only from editorial surfaces and server role checks", async () => {
  const [article, editorial, admin, roles] = await Promise.all([
    read("src/components/site/article-form.tsx"),
    read("src/lib/ai/editorial.functions.ts"),
    read("src/routes/_authenticated/admin/articles.tsx"),
    read("src/hooks/useRoles.ts"),
  ]);
  assert.match(article, /editorialAccess/);
  assert.match(admin, /EditorialAIButton/);
  assert.match(editorial, /const editorialRoles = new Set\(\["moderator", "editor", "admin"\]\)/);
  assert.match(editorial, /Editorial AI requires an approved contributor role/);
  assert.match(roles, /moderator: 3/);
  assert.match(roles, /editor: 4/);
  assert.match(roles, /admin: 5/);
});

test("editorial provider routing is action-specific and public AI uses Groq", async () => {
  const [editorial, publicAI, providers] = await Promise.all([
    read("src/lib/ai/editorial.functions.ts"),
    read("src/lib/ai/public.functions.ts"),
    read("src/lib/ai/providers.server.ts"),
  ]);
  assert.match(editorial, /mode === "autopopulate" \? "groq" : "grok"/);
  assert.match(publicAI, /completeWithProvider\("groq"/);
  assert.match(providers, /GROQ_API_KEY/);
  assert.match(providers, /XAI_API_KEY/);
  assert.match(providers, /response_format: \{ type: "json_object" \}/);
});

test("active persona labels use the resolved profile or page name and safe loading fallbacks", async () => {
  const header = await read("src/components/site/site-header.tsx");
  assert.match(header, /activeIdentityName/);
  assert.match(header, /activePage\?\.name/);
  assert.match(header, /ownNames\[user\.id\]\?\.trim\(\)\s*\|\|\s*"Profile name unavailable"/);
  assert.match(header, /`Browsing as \$\{activeIdentityName\}`/);
  assert.match(header, /\{profileName\}/);
  assert.doesNotMatch(header, /Browsing as your profile/);
});

test("public chat remains authenticated and rate limited while summaries stay public", async () => {
  const source = await read("src/lib/ai/public.functions.ts");
  assert.match(source, /quickAISummary = createServerFn/);
  assert.match(source, /publicAIChat = createServerFn[\s\S]*middleware\(\[requireSupabaseAuth\]\)/);
  assert.match(source, /enforceAIRateLimit\("chat", userId\)/);
  assert.match(source, /enforceAIRateLimit\("summary"\)/);
});

test("My Chats can reopen owner-scoped saved conversations", async () => {
  const [publicAI, dashboard] = await Promise.all([
    read("src/lib/ai/public.functions.ts"),
    read("src/routes/_authenticated/dashboard.tsx"),
  ]);
  assert.match(publicAI, /getAIChat = createServerFn/);
  assert.match(publicAI, /eq\("user_id", context\.userId\)/);
  assert.match(publicAI, /Chat thread not found/);
  assert.match(dashboard, /getAIChat/);
  assert.match(dashboard, /Open chat/);
  assert.match(dashboard, /SafeAIRenderer/);
});

test("signup confirmation preserves a validated AI/content return surface", async () => {
  const auth = await read("src/routes/auth.index.tsx");
  assert.match(auth, /rememberAuthReturnTo\(sessionStorage, returnTo\)/);
  assert.match(auth, /const confirmation = authCallbackUrl\(window\.location\.origin\)/);
  assert.match(auth, /emailRedirectTo: confirmation/);
});

test("AI output uses one safe structured renderer without HTML injection", async () => {
  const [renderer, ai, dashboard] = await Promise.all([
    read("src/components/site/safe-ai-renderer.tsx"),
    read("src/components/site/share-barabara-ai.tsx"),
    read("src/routes/_authenticated/dashboard.tsx"),
  ]);
  assert.match(renderer, /SafeAIRenderer/);
  assert.match(renderer, /strong|em|code/);
  assert.match(renderer, /list-inside/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML/);
  assert.match(ai, /SafeAIRenderer/);
  assert.match(dashboard, /SafeAIRenderer/);
});
