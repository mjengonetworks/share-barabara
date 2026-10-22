import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

const external = await read("src/lib/ai/external.server.ts");
const plan = await read("docs/searxng-deployment-plan.md");
const architecture = await read("docs/external-retrieval-architecture.md");
const pending = await read("PENDING.md");

test("Task 24 keeps SearXNG configuration server-only and fail-closed", () => {
  assert.match(external, /EXTERNAL_SEARCH_PROVIDER/);
  assert.match(external, /SEARXNG_BASE_URL/);
  assert.match(external, /SEARXNG_AUTH_TOKEN/);
  assert.match(external, /external_search_unavailable/);
  assert.doesNotMatch(external, /VITE_SEARXNG|VITE_TAVILY|VITE_EXA/);
  assert.match(architecture, /server-only|server side|server-side/i);
});

test("Task 24 deployment plan requires an owned, reviewed live service", () => {
  assert.match(plan, /No SearXNG instance is provisioned or configured/);
  assert.match(plan, /HTTPS|private network endpoint/i);
  assert.match(plan, /reviewed engines|reviewed engine configuration/i);
  assert.match(plan, /rate limits/i);
  assert.match(plan, /Health checks/i);
  assert.match(plan, /backup|back up/i);
  assert.match(plan, /operational owner/i);
  assert.match(plan, /mocked and live verification/i);
});

test("Task 24 status records the live endpoint as the remaining blocker", () => {
  assert.match(pending, /Task 24 remains TESTING \/ VERIFICATION/);
  assert.match(pending, /no real SearXNG instance is connected yet/);
  assert.match(pending, /Task 25.*live retrieval is verified/s);
});
