import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = readFileSync("src/routes/__root.tsx", "utf8");
const server = readFileSync("src/server.ts", "utf8");
const wrangler = readFileSync("wrangler.jsonc", "utf8");
const docs = readFileSync("docs/staging-release-workflow.md", "utf8");

test("staging indicator and noindex metadata are environment gated", () => {
  assert.match(root, /isStaging/);
  assert.match(root, /STAGING · SHARED DATA/);
  assert.match(root, /noindex, nofollow/);
});

test("production has no staging marker in the root configuration", () => {
  assert.match(wrangler, /DEPLOYMENT_ENV.*production/);
  assert.match(wrangler, /"name": "share-barabara-staging"/);
});

test("staging suppresses scheduled work and protects crawlers", () => {
  assert.match(server, /isStagingRuntime\(\)\) return/);
  assert.ok(server.includes("Disallow: /\\n"));
  assert.match(server, /x-robots-tag/);
});

test("workflow records shared database and approval status boundaries", () => {
  assert.match(docs, /same Supabase project as production/);
  assert.match(docs, /PENDING/);
  assert.match(docs, /TESTING/);
  assert.match(docs, /COMPLETED/);
});
