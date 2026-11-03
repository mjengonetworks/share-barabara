import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildArticlePersistencePayload, resolveArticleStatus } from "../src/lib/article-persistence.ts";

const read = (file) => fs.readFileSync(file, "utf8");

test("all five editorial Add routes are dedicated full-page routes", () => {
  const routes = [
    ["articles.new.tsx", 'EditorialRecordEditor type="article"'],
    ["reports.new.tsx", 'EditorialRecordEditor type="report"'],
    ["alerts.new.tsx", 'EditorialRecordEditor type="alert"'],
    ["campaigns.new.tsx", 'EditorialRecordEditor type="campaign"'],
    ["infrastructure-issues.new.tsx", 'EditorialRecordEditor type="infrastructure"'],
  ];
  for (const [file, marker] of routes) assert.match(read(`src/routes/_authenticated/admin/${file}`), new RegExp(marker));
});

test("My Articles Add and Edit use full-page routes", () => {
  const source = read("src/routes/_authenticated/admin/my-articles.tsx");
  assert.match(source, /href="\/admin\/my-articles\/new"/);
  assert.match(source, /href=\{`\/admin\/articles\/\$\{a\.id\}\/edit`\}/);
  assert.doesNotMatch(source, /<Dialog/);
});

test("Article form has no incident location or mapping contract", () => {
  const source = read("src/components/site/article-form.tsx");
  for (const forbidden of ["Place or feature", "Location type", "Use my current point", "RoadInput", "useArticleLocationSchema", "location_label", "latitude", "longitude"]) {
    assert.doesNotMatch(source, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), forbidden);
  }
  assert.match(source, /htmlFor="a-title"/);
  assert.match(source, /htmlFor="a-summary"/);
  assert.match(source, /htmlFor="a-source"/);
});

test("all admin listing surfaces retain a fixed complete table width on mobile", () => {
  const shared = read("src/components/admin/admin-listing-surface.tsx");
  assert.match(shared, /min-w-\[1100px\]/);
  for (const file of ["articles.tsx", "reports.tsx", "alerts.tsx", "campaigns.tsx", "infrastructure-issues.tsx"]) {
    const source = read(`src/routes/_authenticated/admin/${file}`);
    assert.match(source, /min-w-\[1100px\]/, file);
    assert.doesNotMatch(source, /xl:hidden|hidden[^\n]*xl:(?:block|flex|inline-flex)/, `${file} hides table columns on mobile`);
  }
});

test("Article summary validation remains strict and has a bounded repair path", () => {
  const source = read("src/lib/ai/editorial.functions.ts");
  assert.match(source, /Article summary exceeds 20 words/);
  assert.match(source, /IMPORTANT REPAIR/);
  assert.match(source, /contentType !== "article"/);
  assert.match(source, /No fields were changed/);
});

test("Article status controls use canonical values and the news persistence contract", () => {
  assert.equal(resolveArticleStatus("draft", false), "draft");
  assert.equal(resolveArticleStatus("pending_review", false), "pending_review");
  assert.equal(resolveArticleStatus("published", false), "draft");
  assert.equal(resolveArticleStatus("published", true), "published");

  const form = {
    title: "New road safety article",
    summary: "A concise summary",
    body: "Verified editorial body",
    source: "Source desk",
    category: "News",
    categories: ["News"],
    image_url: "",
    image_alt: "",
    image_caption: "",
    image_credit: "",
    featured: false,
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
  };
  const created = buildArticlePersistencePayload(form, "pending_review", "user-1", false);
  assert.equal(created.author_id, "user-1");
  assert.equal(created.status, "pending_review");
  assert.match(created.slug, /^new-road-safety-article-/);
  assert.equal("user_id" in created, false);

  const editor = read("src/components/admin/editorial-record-editor.tsx");
  assert.match(editor, /Article Status/);
  assert.match(editor, /Create article/);
  assert.match(editor, /Update article/);
  assert.match(editor, /type === "article" \? <Button/);
});

test("Article status remains after Editorial AI and before ordinary fields", () => {
  const editor = read("src/components/admin/editorial-record-editor.tsx");
  const aiPosition = editor.indexOf('aria-labelledby="editorial-ai-heading"');
  const statusPosition = editor.indexOf('aria-labelledby="article-status-heading"');
  const titlePosition = editor.indexOf('id="editor-title"');
  assert.ok(aiPosition >= 0 && statusPosition > aiPosition && titlePosition > statusPosition);
});

test("CMS Add New controls are direct native links to full-page routes", () => {
  const entryPoints = {
    articles: "/admin/articles/new",
    reports: "/admin/reports/new",
    alerts: "/admin/alerts/new",
    campaigns: "/admin/campaigns/new",
    infrastructure: "/admin/infrastructure-issues/new",
    myArticles: "/admin/my-articles/new",
  };
  for (const [name, path] of Object.entries(entryPoints)) {
    const source = read(`src/routes/_authenticated/admin/${name === "myArticles" ? "my-articles" : name === "infrastructure" ? "infrastructure-issues" : name}.tsx`);
    assert.match(source, new RegExp(`className=\\{buttonVariants\\([\\s\\S]*?href=\\"${path.replaceAll("/", "\\/")}`), name);
  }
  assert.match(read("src/routes/_authenticated/admin/index.tsx"), /href="\/admin\/articles\/new">Add News Article/);
});

test("My Articles hands its child creation route to the full-page editor", () => {
  const parent = read("src/routes/_authenticated/admin/my-articles.tsx");
  const child = read("src/routes/_authenticated/admin/my-articles.new.tsx");
  assert.match(parent, /Outlet/);
  assert.match(parent, /admin\/my-articles\/new/);
  assert.match(child, /createFileRoute\("\/_authenticated\/admin\/my-articles\/new"\)/);
  assert.match(child, /ArticleForm editorial/);
});

test("My Content exposes owned destinations and a unified ownership-aware table", () => {
  const source = read("src/routes/_authenticated/admin/my-content.tsx");
  assert.match(source, /\/admin\/my-articles/);
  for (const key of ["reports", "alerts", "campaigns", "infrastructure"]) assert.match(source, new RegExp(`key: "${key}"`), key);
  assert.match(source, /My Quotes/);
  assert.match(source, /No user-owned Quotes list is implemented/);
  assert.match(source, /\.eq\(source\.owner, user!\.id\)/);
  assert.match(source, /AdminListingSurface/);
  assert.match(source, /min-w-\[1100px\]/);
  assert.match(source, /Views order/);
  assert.match(source, /Previous/);
  assert.match(source, /Next/);
  assert.match(source, /admin\/my-articles\/new/);
  assert.match(source, /Add new/);
});

test("shared editor redirects only after successful persistence and refreshes owned lists", () => {
  const editor = read("src/components/admin/editorial-record-editor.tsx");
  assert.match(editor, /useNavigate/);
  assert.match(editor, /queryClient\.invalidateQueries\(\{ queryKey: \["my-content"\] \}\)/);
  assert.match(editor, /await navigate\(\{ to: config\.back \}\)/);
  assert.match(editor, /onError: \(error: Error, variables\)/);
  const articleForm = read("src/components/site/article-form.tsx");
  assert.match(articleForm, /onDone\?\.\(\)/);
  assert.match(articleForm, /onError: \(e: Error\)/);
});

test("Editorial AI loading is single-flight, non-destructive and timed", () => {
  const button = read("src/components/site/editorial-ai-button.tsx");
  assert.match(button, /busy\)/);
  assert.match(button, /setBusy\(true\)/);
  assert.match(button, /performance\.now\(\)/);
  assert.match(button, /filterUnchangedEditorialDraft/);
  assert.match(button, /No fields were changed|No fields were changed/);
  assert.match(button, /Populating fields…/);
});
