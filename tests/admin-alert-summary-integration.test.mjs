import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Admin Add Alert exposes the canonical nullable editorial summary", async () => {
  const form = await read("src/components/site/alert-form.tsx");
  assert.match(form, /summary: ""/);
  assert.match(form, /id="a-summary"/);
  assert.match(form, /summary: form\.summary\.trim\(\) \|\| null/);
  assert.match(form, /field !== "summary"/);
  assert.doesNotMatch(form, /setForm\(\(current\) => \(\{[\s\S]*summary.*draft/);
});

test("Admin Edit Alert hydrates and saves the same summary without AI overwriting it", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  assert.match(editor, /summary: stringValue\(record, "summary"\)/);
  assert.match(editor, /type === "alert" && key === "summary"/);
  assert.match(editor, /summary: form\.summary\.trim\(\) \|\| null/);
  assert.match(editor, /type === "article" \|\| type === "alert" \|\| type === "infrastructure"/);
});

test("Alert Summary contract remains migration-gated and separate from AI Summary", async () => {
  const migration = await read("supabase/migrations/20261028100000_alert_editorial_summary.sql");
  const contract = await read("docs/public-alert-summary-contract.md");
  assert.match(migration, /alerts[\s\S]*ADD COLUMN IF NOT EXISTS summary TEXT/);
  assert.match(contract, /public\.alerts\.summary TEXT/);
  assert.match(contract, /not executed/);
});
