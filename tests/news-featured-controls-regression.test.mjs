import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file) => fs.readFileSync(file, "utf8");
const news = read("src/routes/news.index.tsx");
const editor = read("src/components/admin/editorial-record-editor.tsx");

test("News always renders Featured Articles between Latest and Trending", () => {
  const defaultHierarchy = news.slice(news.indexOf('<div className="mt-4 space-y-0">'));
  assert.match(defaultHierarchy, /title="Latest News"/);
  assert.match(defaultHierarchy, /title="Featured Articles"/);
  assert.match(defaultHierarchy, /title="Trending News"/);
  assert.match(defaultHierarchy, /No Featured Articles have been selected by editors yet\./);
  assert.ok(defaultHierarchy.indexOf('title="Latest News"') < defaultHierarchy.indexOf('title="Featured Articles"'));
  assert.ok(defaultHierarchy.indexOf('title="Featured Articles"') < defaultHierarchy.indexOf('title="Trending News"'));
});

test("News sections use compact spacing and retain a three-card featured grid", () => {
  assert.match(news, /title="Featured Articles"[\s\S]*?ArticleGridWithAds articles=\{loaderData\.featured\.slice\(0, 3\)\}/);
  assert.match(news, /EditorialBand className="py-5 sm:py-7"/);
  assert.doesNotMatch(news, /EditorialBand className="mt-8/);
});

test("shared editorial editors expose persisted Featured controls for Articles, Reports and Alerts", () => {
  assert.match(editor, /featured: Boolean\(record\.featured\)/);
  assert.match(editor, /featured: form\.featured/);
  assert.match(editor, /Featured \{config\.label\}/);
  assert.match(editor, /Save & publish/);
});

test("Report and Alert edit forms consume the existing incident relationship review panel", () => {
  assert.match(editor, /IncidentRelationshipPanel/);
  assert.match(editor, /isEditing && \(type === "report" \|\| type === "alert"\)/);
});

