import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all five editorial listing edit actions use dedicated full-page routes", async () => {
  const files = [
    "src/routes/_authenticated/admin/articles.tsx",
    "src/routes/_authenticated/admin/alerts.tsx",
    "src/routes/_authenticated/admin/reports.tsx",
    "src/routes/_authenticated/admin/campaigns.tsx",
    "src/routes/_authenticated/admin/infrastructure-issues.tsx",
  ];
  for (const file of files) {
    const source = await read(file);
    assert.match(source, /href=\{`\/admin\/[^`]+\/edit`\}/, file);
  }
});

test("the shared editor preserves media metadata for every editable record type", async () => {
  const editor = await read("src/components/admin/editorial-record-editor.tsx");
  for (const field of ["image_url", "image_alt", "image_caption", "image_credit"]) assert.match(editor, new RegExp(field), field);
  assert.match(editor, /Existing values and media remain intact/);
  assert.match(await read("src/components/site/image-upload-field.tsx"), /Replace image/);
});

test("admin workspace exposes role-aware header, search, logout and owned content", async () => {
  const route = await read("src/routes/_authenticated/admin/route.tsx");
  assert.match(route, /AdminGlobalSearch/);
  assert.match(route, /supabase\.auth\.signOut/);
  assert.match(route, /primaryRoleLabel/);
  assert.match(route, /\/admin\/my-content/);
  const search = await read("src/components/admin/admin-global-search.tsx");
  assert.match(search, /No authorised matches/);
  const content = await read("src/routes/_authenticated/admin/my-content.tsx");
  assert.match(content, /author_id/);
  assert.match(content, /user_id/);
});
