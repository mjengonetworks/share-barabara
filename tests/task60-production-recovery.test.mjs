import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");

test("primary navigation consolidates Videos under Media & Feed without removing its route", () => {
  const header = read("src/components/site/site-header.tsx");
  const videos = read("src/routes/videos.tsx");
  assert.match(header, /to: "\/feed", label: "Media & Feed"/);
  assert.doesNotMatch(header, /to: "\/videos", label: "Videos"/);
  assert.match(videos, /createFileRoute\("\/videos"\)/);
});

test("editorial provider contracts remain server-side and action-specific", () => {
  const editorial = read("src/lib/ai/editorial.functions.ts");
  const providers = read("src/lib/ai/providers.server.ts");
  assert.match(editorial, /mode === "autopopulate" \? "groq" : "grok"/);
  assert.match(providers, /GROQ_API_KEY/);
  assert.match(providers, /XAI_API_KEY/);
  assert.match(providers, /openai\/gpt-oss-120b/);
});

test("project publishing is not represented as a local Share Barabara schema", () => {
  const schema = read("docs/task60-project-publishing-schema.md");
  assert.match(schema, /no `projects` Supabase table/);
  assert.match(schema, /BLOCKED \/ NOT EVIDENCED/);
  assert.match(read("src/lib/mjengo.functions.ts"), /fetchText\("\/projects"\)/);
});

test("Task 60 reports preserve deployment and migration safety boundaries", () => {
  const deployment = read("docs/task60-deployment-verification.md");
  const migration = read("docs/task60-production-migration-preflight.md");
  assert.match(deployment, /UNVERIFIED/);
  assert.match(deployment, /GROQ_API_KEY.*XAI_API_KEY|XAI_API_KEY.*GROQ_API_KEY/s);
  assert.match(migration, /subscription-payment migration is protected and excluded/);
  assert.match(migration, /Do not execute SQL|did not execute SQL/);
});

test("Task 60 bookkeeping identifies repository completion without production approval", () => {
  const pending = read("PENDING.md");
  assert.match(pending, /Task 60[\s\S]*?TESTING \/ VERIFICATION/);
  assert.match(pending, /production[\s\S]*deployment version[\s\S]*remain unverified/i);
});
