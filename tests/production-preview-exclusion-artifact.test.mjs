import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.cwd();
const serverDir = path.join(root, ".output", "server");

async function readServerPayload() {
  const entries = await readdir(serverDir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
  return Promise.all(files.map((file) => readFile(file, "utf8")));
}

test(
  "production artifact excludes synthetic preview execution and denies its route",
  { skip: process.env.RUN_PRODUCTION_ARTIFACT_GATE !== "1" },
  async () => {
    const entryPath = path.join(serverDir, "index.mjs");
    const wranglerPath = path.join(serverDir, "wrangler.json");
    const [entry, wrangler, modules] = await Promise.all([
      readFile(entryPath, "utf8"),
      readFile(wranglerPath, "utf8").then(JSON.parse),
      readServerPayload(),
    ]);

    assert.equal(wrangler.name, "share-barabara");
    assert.equal(wrangler.vars?.DEPLOYMENT_ENV, "production");
    assert.equal(wrangler.vars?.WEB_PUSH_ENABLED, "true");
    assert.ok(
      entry.includes("staging-media-feed-preview"),
      "the route guard must remain in the Worker entrypoint",
    );
    assert.ok(
      !modules.some((source) => source.includes("Synthetic preview data")),
      "synthetic preview data must not ship in production SSR modules",
    );
    assert.ok(
      !modules.some((source) => source.includes("preview-article-1")),
      "synthetic preview records must not ship in production SSR modules",
    );

    const worker = await import(pathToFileURL(entryPath).href);
    const response = await worker.default.fetch(
      new Request("https://sharebarabara.co.ke/staging-media-feed-preview"),
      { DEPLOYMENT_ENV: "production", WEB_PUSH_ENABLED: "true" },
      { waitUntil() {} },
    );
    assert.equal(response.status, 404);
  },
);
