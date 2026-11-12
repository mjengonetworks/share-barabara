import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");

test("desktop Articles filters share one compact row and table keeps aligned action columns", () => {
  const articles = read("src/routes/_authenticated/admin/articles.tsx");
  assert.match(articles, /sm:grid-cols-3 lg:grid-cols-\[minmax\(10rem,1fr\)_minmax\(10rem,1fr\)_minmax\(16rem,2fr\)\]/);
  assert.match(articles, /grid w-full min-w-0 grid-cols-\[20px_40px_minmax\(0,1fr\)_40px\]/);
  assert.match(articles, /<span>Actions<\/span>/);
  assert.match(articles, /data-row-action/);
  assert.match(articles, /line-clamp-2/);
});

test("shared listings avoid clipping and provide a deliberate mobile presentation", () => {
  const shared = read("src/components/admin/admin-listing-surface.tsx");
  assert.match(shared, /w-full min-w-0 overflow-visible/);
  assert.match(shared, /data-admin-listing-row/);
  for (const file of ["articles.tsx", "reports.tsx", "alerts.tsx", "campaigns.tsx", "infrastructure-issues.tsx"]) {
    const source = read(`src/routes/_authenticated/admin/${file}`);
    assert.match(source, /md:hidden/);
  }
});

test("My Content uses compact navigation and an owner-scoped query for every supported source", () => {
  const source = read("src/routes/_authenticated/admin/my-content.tsx");
  assert.match(source, /<nav className="mt-3 flex flex-wrap gap-2"/);
  assert.match(source, /quote_submissions/);
  assert.match(source, /owner: "created_by"/);
  assert.match(source, /\.eq\(source\.owner, user!\.id\)/);
  assert.match(source, /if \(error\) throw error/);
  assert.match(source, /Previous/);
  assert.match(source, /Next/);
});

test("My Quotes has a real owner-scoped destination and no unavailable placeholder", () => {
  const source = read("src/routes/_authenticated/admin/my-content.tsx");
  assert.match(source, /key: "quotes"/);
  assert.match(source, /href: source\.key === "articles" \? "/);
  assert.match(source, /titleKey: "quote"/);
  assert.doesNotMatch(source, /No user-owned Quotes list is implemented/);
});

test("campaign ownership uses the production created_by column and derived lifecycle", () => {
  const source = read("src/routes/_authenticated/admin/my-content.tsx");
  assert.match(source, /table: "campaigns", owner: "created_by"/);
  assert.match(source, /start_date,end_date,created_by/);
  assert.match(source, /campaignStatus\(row\.start_date, row\.end_date\)/);
  assert.doesNotMatch(source, /campaigns.*select: "id,title,status/);
});
