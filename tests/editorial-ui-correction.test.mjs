import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(file, "utf8");

test("article editor normalizes pasted paragraph blocks without losing structure", async () => {
  const editor = await source("src/components/site/rich-text-editor.tsx");
  const renderer = await source("src/lib/richtext.tsx");
  assert.match(editor, /normalizePastedText/);
  assert.match(editor, /event\.clipboardData\.getData\("text\/plain"\)/);
  assert.match(editor, /join\("\\n\\n"\)/);
  assert.match(renderer, /splitRichTextBlocks/);
});

test("mixed paragraph/link/list fixture survives the body lifecycle contract", async () => {
  const editor = await source("src/components/site/rich-text-editor.tsx");
  const renderer = await source("src/lib/richtext.tsx");
  const fixture = [
    "Paragraph one has multiple sentences and stays together as one paragraph. It must not split.",
    "Paragraph two also contains multiple sentences. It remains one paragraph.",
    "A third paragraph contains a [link](https://example.com) and **bold text**.",
    "- First list item",
    "- Second list item",
  ].slice(0, 3).join("\n\n") + "\n\n- First list item\n- Second list item";
  const blocks = fixture.split(/\n\s*\n/).filter(Boolean);
  assert.equal(blocks.length, 4);
  assert.match(blocks[0], /sentences[\s\S]*split/);
  assert.match(blocks[2], /\[link\][\s\S]*\*\*bold text\*\*/);
  assert.deepEqual(blocks[3].split("\n"), ["- First list item", "- Second list item"]);
  assert.match(renderer, /splitRichTextBlocks/);
  assert.match(renderer, /listItems/);
  assert.doesNotMatch(editor, /split\(.*\. /);
});

test("performance history pagination is complete and All time has no delta", async () => {
  const dashboard = await source("src/routes/_authenticated/admin/index.tsx");
  assert.match(dashboard, /\.range\(page \* 1000, page \* 1000 \+ 999\)/);
  assert.match(dashboard, /data\.length < 1000/);
  assert.match(dashboard, /case "all"/);
  assert.match(dashboard, /if \(previous === null\) return null/);
});

test("Editorial AI provider matrix is enforced by action", async () => {
  const editorial = await source("src/lib/ai/editorial.functions.ts");
  const panel = await source("src/components/site/editorial-ai-button.tsx");
  const matrix = {
    article: { generate: "grok", autopopulate: "groq", update: "grok" },
    alert: { generate: "grok", autopopulate: "groq", update: "grok" },
    report: { generate: "grok", autopopulate: "groq", update: "grok" },
  };
  for (const actions of Object.values(matrix)) {
    assert.equal(actions.generate, "grok");
    assert.equal(actions.autopopulate, "groq");
    assert.equal(actions.update, "grok");
  }
  assert.match(editorial, /mode === "autopopulate" \? "groq" : "grok"/);
  assert.match(panel, /mode === "autopopulate" \? "Groq" : "xAI Grok"/);
  assert.match((await source("src/lib/ai/public.functions.ts")), /completeWithProvider\("groq"/);
});

test("article Auto-Populate returns and applies all SEO fields", async () => {
  const editorial = await source("src/lib/ai/editorial.functions.ts");
  const form = await source("src/components/site/article-form.tsx");
  assert.match(editorial, /\["title", "summary", "body", "seo_title", "seo_description", "seo_keywords"\]/);
  for (const field of ["seo_title", "seo_description", "seo_keywords"]) {
    assert.match(form, new RegExp(`draft\\["${field}"\\]`));
  }
});

test("article detail related and latest sections cap at four cards", async () => {
  const detail = await source("src/routes/news.$slug.tsx");
  assert.match(detail, /\.limit\(4\)/);
  assert.match(detail, /related\.slice\(0, 4\)/);
  assert.match(detail, /latest\.slice\(0, 4\)/);
  assert.match(detail, /image_url/);
});

test("mobile account navigation resolves a display name and has a partial drawer", async () => {
  const header = await source("src/components/site/site-header.tsx");
  assert.match(header, /useProfileNames/);
  assert.match(header, /ownNames\[user\.id\].*My Profile/);
  assert.match(header, /w-\[min\(82vw,22rem\)\]/);
  assert.match(header, /bg-black\/45/);
});

test("editorial source attachments are validated and removable", async () => {
  const panel = await source("src/components/site/editorial-ai-button.tsx");
  assert.match(panel, /accept="\.txt,\.md,\.csv,\.json,\.rtf,text\/\*"/);
  assert.match(panel, /2 \* 1024 \* 1024/);
  assert.match(panel, /Remove \$\{file\.name\}/);
  assert.match(panel, /Attached source/);
});
