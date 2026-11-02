import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

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
  assert.match(source, /to="\/admin\/my-articles\/new"/);
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
