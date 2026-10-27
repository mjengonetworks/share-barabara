import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

test("shared public media metadata keeps captions italic and credits upright without prefixes", async () => {
  const source = await fs.readFile("src/components/site/editorial-media-meta.tsx", "utf8");
  assert.match(source, /<em>\{cleanCaption\}<\/em>/);
  assert.match(source, /<span>\{cleanCredit\}<\/span>/);
  assert.doesNotMatch(source, /Credit:/);
  assert.match(source, /if \(!cleanCaption && !cleanCredit\) return null/);
});

test("public detail routes use the shared media and summary primitives", async () => {
  const files = [
    "src/routes/news.$slug.tsx",
    "src/routes/alerts.$alertId.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/campaigns.$slug.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
  ];
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    assert.match(source, /EditorialMediaMeta/);
    assert.match(source, /EditorialSummary/);
    assert.doesNotMatch(source, /Credit: \{/);
  }
});

test("global editorial detail styling restores the original summary and Read Also treatments", async () => {
  const summary = await fs.readFile("src/components/site/editorial-summary.tsx", "utf8");
  assert.match(summary, /bg-sky-50/);
  assert.match(summary, /w-\[10px\]/);
  assert.match(summary, /repeating-linear-gradient/);
  assert.match(summary, /Read also/);
  assert.match(summary, /border-brand-navy/);
  assert.match(summary, /bg-sky-50.*px-3.*py-2/s);
  assert.match(summary, /<p className=.*Read also.*<\/p>[\s\S]*<Link/);
  const article = await fs.readFile("src/routes/news.$slug.tsx", "utf8");
  assert.match(article, /<ReadAlso related=\{related\} \/>/);
  assert.doesNotMatch(article, /Read also:.*related\.title/s);
});

test("public detail category badges share the compact yellow/navy treatment", async () => {
  const ui = await fs.readFile("src/components/site/public-ui.tsx", "utf8");
  assert.match(ui, /publicEditorialCategoryBadgeClass/);
  assert.match(ui, /bg-accent/);
  assert.match(ui, /border-brand-navy/);
  assert.match(ui, /text-brand-navy/);
  assert.match(ui, /px-2 py-0\.5/);

  const detailRoutes = [
    "src/routes/news.$slug.tsx",
    "src/routes/alerts.$alertId.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/campaigns.$slug.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
  ];
  for (const file of detailRoutes) {
    const source = await fs.readFile(file, "utf8");
    assert.match(source, /PublicEditorialCategoryBadge|publicEditorialCategoryBadgeClass/, file);
  }

  const preview = await fs.readFile("src/components/site/global-editorial-preview.tsx", "utf8");
  assert.doesNotMatch(preview, /publicEditorialCategoryBadge/);
});

test("public category navigation uses compact yellow/navy shared controls", async () => {
  const ui = await fs.readFile("src/components/site/public-ui.tsx", "utf8");
  assert.match(ui, /publicCategoryNavigationClass/);
  assert.match(ui, /bg-accent/);
  assert.match(ui, /border-brand-navy/);
  for (const file of ["src/routes/news.index.tsx", "src/routes/alerts.index.tsx", "src/routes/reports.index.tsx"]) {
    const source = await fs.readFile(file, "utf8");
    assert.match(source, /publicCategoryNavigation/);
  }
});

test("public header and detail pages use the compact spacing contract", async () => {
  const header = await fs.readFile("src/components/site/site-header.tsx", "utf8");
  assert.match(header, /items-center gap-1 px-1\.5/);
  assert.match(header, /justify-start rounded-md pl-0\.5[\s\S]*sm:justify-center sm:pl-0/);
  assert.match(header, /className="-ml-3 flex items-center sm:ml-0"/);
  const layout = await fs.readFile("src/components/site/public-layout.tsx", "utf8");
  assert.match(layout, /min-h-\[38px\][\s\S]*py-1 text-xs/);

  const article = await fs.readFile("src/routes/news.$slug.tsx", "utf8");
  assert.match(article, /<div className="mt-2 pb-2">/);
  assert.match(article, /<p className="mt-1\.5 text-sm text-muted-foreground">/);
  assert.doesNotMatch(article, /border-b border-border\/70 pb-4/);
  assert.match(article, /px-2 py-1\.5/);

  for (const file of [
    "src/routes/alerts.$alertId.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/campaigns.$slug.tsx",
    "src/routes/infrastructure-issues.$issueId.tsx",
  ]) {
    const source = await fs.readFile(file, "utf8");
    assert.match(source, /py-1\.5|py-3/);
    assert.match(source, /p-1\.5|p-2/);
    assert.match(source, /mt-1\.5/);
  }
});

test("admin content listings use the shared responsive listing surface", async () => {
  const files = ["articles", "alerts", "reports", "campaigns", "infrastructure-issues"];
  for (const name of files) {
    const source = await fs.readFile(`src/routes/_authenticated/admin/${name}.tsx`, "utf8");
    assert.match(source, /AdminListingSurface/);
    assert.match(source, /image_url/);
  }
  const listing = await fs.readFile("src/components/admin/admin-listing-surface.tsx", "utf8");
  assert.match(listing, /odd:bg-background/);
  assert.match(listing, /lg:grid/);
});

test("admin editorial listings use the Mjengo-style checkbox, thumbnail and dense row hierarchy", async () => {
  const files = ["articles", "alerts", "reports", "campaigns", "infrastructure-issues"];
  for (const name of files) {
    const source = await fs.readFile(`src/routes/_authenticated/admin/${name}.tsx`, "utf8");
    assert.match(source, /w-full max-w-\[1500px\]/, `${name} keeps a full admin content width`);
    assert.match(source, /type="checkbox"/, `${name} exposes the selection column`);
    assert.match(source, /image_url/, `${name} exposes the featured image field`);
  }
  const listing = await fs.readFile("src/components/admin/admin-listing-surface.tsx", "utf8");
  assert.match(listing, /grid-cols-\[auto_72px_minmax/);
  assert.match(listing, /uppercase tracking-wider/);
  assert.match(listing, /even:bg-muted/);
});
