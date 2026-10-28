import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin workspace is isolated from public site chrome", async () => {
  const root = await read("src/routes/__root.tsx");
  const layout = await read("src/routes/_authenticated/admin/route.tsx");
  assert.match(root, /const isAdminApp = pathname === "\/admin" \|\| pathname\.startsWith\("\/admin\/"\)/);
  assert.match(root, /!isAdminApp \? <SiteHeader \/> : null/);
  assert.match(root, /!isAdminApp \? <SiteFooter \/> : null/);
  assert.match(layout, /function AdminLayout\(\)/);
  assert.match(layout, /SidebarProvider/);
  assert.match(layout, /Back to my activity/);
});

test("content management pages expose internal authoring and website preview actions", async () => {
  const [articles, alerts, reports, campaigns, header] = await Promise.all([
    read("src/routes/_authenticated/admin/articles.tsx"),
    read("src/routes/_authenticated/admin/alerts.tsx"),
    read("src/routes/_authenticated/admin/reports.tsx"),
    read("src/routes/_authenticated/admin/campaigns.tsx"),
    read("src/components/admin/admin-page-header.tsx"),
  ]);
  assert.match(header, /View on website/);
  assert.match(articles, /to="\/admin\/my-articles"/);
  assert.match(alerts, /<AlertForm editorial onDone=/);
  assert.match(reports, /<ReportForm editorial onDone=/);
  assert.match(campaigns, /websiteHref="\/campaigns"/);
  for (const source of [articles, alerts, reports, campaigns]) {
    assert.match(source, /AdminPageHeader/);
  }
});

test("admin content editing retains editorial AI and public route preservation", async () => {
  const [articles, alerts, reports, publicRoutes] = await Promise.all([
    read("src/routes/_authenticated/admin/articles.tsx"),
    read("src/routes/_authenticated/admin/alerts.tsx"),
    read("src/routes/_authenticated/admin/reports.tsx"),
    read("src/routes/news.index.tsx"),
  ]);
  for (const source of [articles, alerts, reports]) assert.match(source, /EditorialAIButton/);
  assert.match(publicRoutes, /createFileRoute\("\/news\/"\)/);
  assert.match(publicRoutes, /\.from\("news"\)/);
});
