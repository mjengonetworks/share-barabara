import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isSafeRichTextUrl,
  normalizeRichTextForEditor,
  parseInlineImageBlock,
  replaceInlineImageAt,
  serializeInlineImageBlock,
} from "../src/lib/rich-text-format.ts";
import { normalizeAccidentReportAiObject, mapAccidentReportAiDraftToForm } from "../src/lib/ai/accident-report-contract.ts";

test("the shared editor exposes the complete safe toolbar contract", async () => {
  const editor = await readFile("src/components/site/rich-text-editor.tsx", "utf8");
  for (const control of [
    "Text style", "Bold", "Italic", "Underline", "Strikethrough", "Align left", "Align centre", "Align right", "Justify",
    "Bulleted list", "Numbered list", "Increase indent", "Decrease indent", "Insert or edit link", "Unlink", "Blockquote",
    "Code formatting", "Text colour", "Background highlighting", "Clear formatting", "Upload image", "Insert video", "Undo", "Redo",
  ]) assert.match(editor, new RegExp(`label=\\"${control}\\"|data-rich-text-control=\\"${control}\\"|data-rich-text-control={\\"${control}\\"}`), control);
  assert.match(editor, /role="toolbar"/);
  assert.match(editor, /onPaste=/);
  assert.match(editor, /Save &amp; Close/);
  assert.match(editor, /Close \/ Cancel/);
});

test("inline image metadata is independently serialised and editable", () => {
  const first = serializeInlineImageBlock({ alt: "First", url: "https://cdn.example/one.jpg", caption: "First caption", credit: "First source" });
  const second = serializeInlineImageBlock({ alt: "Second", url: "https://cdn.example/two.jpg", caption: "Second caption", credit: "Second source" });
  const content = `${first}\n\n${second}`;
  assert.deepEqual(parseInlineImageBlock(first), { alt: "First", url: "https://cdn.example/one.jpg", caption: "First caption", credit: "First source", raw: first });
  const updated = replaceInlineImageAt(content, 1, { alt: "Second updated", url: "https://cdn.example/two.jpg", caption: "New caption", credit: "New source" });
  assert.deepEqual(parseInlineImageBlock(updated.split("\n\n")[0]), parseInlineImageBlock(first));
  assert.equal(parseInlineImageBlock(updated.split("\n\n")[1]).caption, "New caption");
  assert.equal(parseInlineImageBlock(updated.split("\n\n")[1]).credit, "New source");
  assert.doesNotMatch(updated, /Second%20caption/);
});

test("rich-text normalisation preserves paragraph boundaries and rejects unsafe URLs", () => {
  assert.equal(normalizeRichTextForEditor("<p>First paragraph</p><p>Second paragraph</p>"), "First paragraph\n\nSecond paragraph");
  assert.equal(normalizeRichTextForEditor("First paragraph\n\nSecond paragraph"), "First paragraph\n\nSecond paragraph");
  assert.equal(isSafeRichTextUrl("https://example.com"), true);
  assert.equal(isSafeRichTextUrl("javascript:alert(1)"), false);
  assert.equal(isSafeRichTextUrl("data:text/html,<script>alert(1)</script>", "media"), false);
});

test("Accident Report SEO description and full content use the real editor fields", () => {
  const result = normalizeAccidentReportAiObject({
    seoDescription: "Two people were injured in a collision on Mombasa Road.",
    body: "<p>First paragraph.</p><p>Second paragraph.</p>",
  });
  assert.equal(result.draft.seo_description, "Two people were injured in a collision on Mombasa Road.");
  assert.equal(result.draft.description, "First paragraph.\n\nSecond paragraph.");
  assert.deepEqual(mapAccidentReportAiDraftToForm(result.draft, "body"), {
    seo_description: "Two people were injured in a collision on Mombasa Road.",
    body: "First paragraph.\n\nSecond paragraph.",
  });
});

test("all applicable CMS editors mount the same shared editor", async () => {
  const files = [
    "src/components/admin/editorial-record-editor.tsx",
    "src/components/site/article-form.tsx",
    "src/components/site/alert-form.tsx",
    "src/components/site/infrastructure-issue-form.tsx",
    "src/routes/_authenticated/admin/campaigns.tsx",
    "src/components/site/editorial-updates-manager.tsx",
  ];
  for (const file of files) assert.match(await readFile(file, "utf8"), /RichTextEditor/);
});

test("public media metadata uses semantic figure caption styling", async () => {
  const meta = await readFile("src/components/site/editorial-media-meta.tsx", "utf8");
  assert.match(meta, /<em>\{cleanCaption\}<\/em>/);
  assert.match(meta, /aria-hidden="true" className="mx-1\.5 not-italic"/);
  assert.match(meta, /<span>\{cleanCredit\}<\/span>/);
});
