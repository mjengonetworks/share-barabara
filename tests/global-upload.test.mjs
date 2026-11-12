import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyUploadFile,
  formatUploadSize,
  validateUploadFile,
} from "../src/lib/upload-validation.ts";

test("shared upload validation accepts supported media and rejects unsafe types", () => {
  assert.equal(classifyUploadFile({ name: "scene.jpg", type: "image/jpeg" }), "image");
  assert.equal(classifyUploadFile({ name: "response.mp4", type: "video/mp4" }), "video");
  assert.equal(classifyUploadFile({ name: "police-report.pdf", type: "" }), "document");
  assert.equal(classifyUploadFile({ name: "script.exe", type: "application/octet-stream" }), null);
  assert.equal(validateUploadFile({ name: "report.docx", type: "", size: 1024 }).kind, "document");
  assert.throws(
    () => validateUploadFile({ name: "large.jpg", type: "image/jpeg", size: 9 * 1024 * 1024 }),
    /maximum 8MB/,
  );
  assert.equal(formatUploadSize(1024 * 1024), "1.0 MB");
});

test("shared upload surfaces expose drag/drop, multi-file selection and safe removal", async () => {
  const attachments = await readFile("src/components/site/attachments-field.tsx", "utf8");
  const image = await readFile("src/components/site/image-upload-field.tsx", "utf8");
  assert.match(attachments, /onDrop=/);
  assert.match(attachments, /multiple/);
  assert.match(attachments, /duplicate file/);
  assert.match(attachments, /Remove \$\{displayName\(attachment\)\}/);
  assert.match(image, /onDrop=/);
  assert.match(image, /Featured image upload/);
});

test("CMS upload sections use the approved names and order", async () => {
  const editor = await readFile("src/components/admin/editorial-record-editor.tsx", "utf8");
  const report = await readFile("src/components/site/report-form.tsx", "utf8");
  const alert = await readFile("src/components/site/alert-form.tsx", "utf8");
  for (const source of [editor, report, alert]) {
    assert.match(source, /More Photos and Videos/);
    assert.match(source, /Documents/);
    assert.match(source, /scope=\"media\"/);
    assert.match(source, /scope=\"documents\"/);
  }
  assert.ok(editor.indexOf("Featured Image") < editor.indexOf("More Photos and Videos"));
  assert.ok(editor.indexOf("More Photos and Videos") < editor.indexOf("Documents"));
});

test("existing rich-text media upload remains separate from featured images", async () => {
  const editor = await readFile("src/components/site/rich-text-editor.tsx", "utf8");
  assert.match(editor, /uploadMedia\(file, user\.id\)/);
  assert.match(editor, /replaceInlineImageAt/);
});
