import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("all five editorial listings navigate Edit to dedicated full editor routes", async () => {
  const sources = await Promise.all([
    read("src/routes/_authenticated/admin/articles.tsx"),
    read("src/routes/_authenticated/admin/reports.tsx"),
    read("src/routes/_authenticated/admin/alerts.tsx"),
    read("src/routes/_authenticated/admin/campaigns.tsx"),
    read("src/routes/_authenticated/admin/infrastructure-issues.tsx"),
  ]);
  assert.match(sources[0], /\/admin\/articles\/\$\{a\.id\}\/edit/);
  assert.match(sources[1], /\/admin\/reports\/\$\{r\.id\}\/edit/);
  assert.match(sources[2], /\/admin\/alerts\/\$\{a\.id\}\/edit/);
  assert.match(sources[3], /\/admin\/campaigns\/\$\{c\.id\}\/edit/);
  assert.match(sources[4], /\/admin\/infrastructure-issues\/\$\{i\.id\}\/edit/);
});

test("shared editor loads existing records, preserves media fields and routes all AI actions", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  for (const type of ["article", "alert", "report", "campaign", "infrastructure"]) assert.match(editor, new RegExp(`type === \\"${type}\\"`));
  assert.match(editor, /select\("\*"\)/);
  assert.match(editor, /ImageUploadField/);
  assert.match(editor, /image_caption/);
  assert.match(editor, /image_credit/);
  assert.match(editor, /contentId=\{id\}/);
  assert.match(editor, /mode: "update"/);
  assert.match(editor, /\.update\(patch\).*\.eq\("id", id\)/s);
});
