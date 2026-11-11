import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const server = await readFile("src/lib/accident-report-persistence.server.ts", "utf8");
const client = await readFile("src/lib/accident-report-api.ts", "utf8");

test("authentication, validation and database failures are returned as structured HTTP results", () => {
  assert.match(server, /AUTHENTICATION_FAILED/);
  assert.match(server, /VALIDATION_FAILED/);
  assert.match(server, /failure\(id, operation/);
  assert.match(server, /return response\(failure/);
  assert.match(server, /ok: false/);
});

test("unexpected transport failures are uncertain rather than false successes", () => {
  assert.match(client, /outcome: "uncertain"/);
  assert.match(client, /PERSISTENCE_UNCERTAIN/);
  assert.match(server, /PERSISTENCE_UNCERTAIN/);
  assert.doesNotMatch(server, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("create and update labels are derived from the HTTP method and route", () => {
  assert.match(server, /request\.method === "POST" \? "create" : "update"/);
  assert.match(server, /PUT/);
  assert.match(client, /const operation = input\.id \? "update" : "create"/);
});
