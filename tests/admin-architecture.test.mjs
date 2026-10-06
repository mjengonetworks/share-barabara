import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin paths use a single root-level application boundary without public footer chrome", async () => {
  const root = await read("src/routes/__root.tsx");
  assert.match(root, /useRouterState/);
  assert.match(root, /pathname === "\/admin" \|\| pathname\.startsWith\("\/admin\/"\)/);
  assert.match(root, /!isAdminApp \? <SiteFooter \/> : null/);
  assert.match(root, /!isAdminApp \? <NewsletterForm|SiteFooter/);
  assert.match(root, /!isAdminApp \? <NotificationPermissionPrompt/);
  assert.match(root, /!isAdminApp \? <CookieConsent/);
});

test("admin route owns the workspace navigation and public pages retain the footer", async () => {
  const admin = await read("src/routes/_authenticated/admin/route.tsx");
  const root = await read("src/routes/__root.tsx");
  assert.match(admin, /SidebarProvider/);
  assert.match(admin, /Admin dashboard/);
  assert.match(admin, /to: "\/admin\/articles"/);
  assert.match(admin, /to: "\/admin\/alerts"/);
  assert.match(admin, /to: "\/admin\/reports"/);
  assert.match(admin, /to: "\/admin\/feed"/);
  assert.match(admin, /to: "\/admin\/crash-statistics"/);
  assert.match(root, /<SiteFooter \/>/);
});

test("editorial AI is wired to admin editors while public submission forms remain clean", async () => {
  const [articles, alerts, reports, updates, publicAlert, publicReport, editorial] = await Promise.all([
    read("src/routes/_authenticated/admin/articles.tsx"),
    read("src/routes/_authenticated/admin/alerts.tsx"),
    read("src/routes/_authenticated/admin/reports.tsx"),
    read("src/components/site/editorial-updates-manager.tsx"),
    read("src/components/site/alert-form.tsx"),
    read("src/components/site/report-form.tsx"),
    read("src/lib/ai/editorial.functions.ts"),
  ]);
  for (const source of [articles, alerts, reports, updates]) {
    assert.match(source, /EditorialAIButton/);
  }
  assert.doesNotMatch(publicAlert, /EditorialAIButton|generateEditorialDraft/);
  assert.doesNotMatch(publicReport, /EditorialAIButton|generateEditorialDraft/);
  assert.match(editorial, /editorialRoles = new Set\(\["moderator", "editor", "admin"\]\)/);
  assert.match(editorial, /Editorial AI requires an approved contributor role/);
  assert.match(editorial, /mode === "autopopulate" \? "groq" : "grok"/);
});
