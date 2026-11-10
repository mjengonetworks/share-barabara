import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync("src/lib/ad-placement.ts", "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(ts.transpile(source, { module: ts.ModuleKind.ESNext })).toString("base64")}`;
const { withAdPlacements } = await import(moduleUrl);

const kinds = (items, offset = 0) => withAdPlacements(items, offset).map((entry) => entry.kind);

test("places one ad after exactly six content items", () => {
  assert.deepEqual(kinds([1, 2, 3, 4, 5, 6]), ["content", "content", "content", "content", "content", "content", "ad"]);
});

test("places intervals after items six and twelve without counting ads", () => {
  assert.deepEqual(kinds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), [
    ...Array(6).fill("content"), "ad", ...Array(6).fill("content"), "ad",
  ]);
});

test("continues a paginated count and does not add a partial interval", () => {
  assert.deepEqual(kinds([5, 6, 7], 3), ["content", "content", "content", "ad"]);
  assert.deepEqual(kinds([5, 6, 7, 8], 5), ["content", "ad", "content", "content", "content"]);
});
