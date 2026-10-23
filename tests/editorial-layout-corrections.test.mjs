import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(file, "utf8");

test("report submission is a post-group card rather than a persistent sidebar", async () => {
  const [reports, form] = await Promise.all([
    source("src/routes/reports.index.tsx"),
    source("src/components/site/report-form.tsx"),
  ]);
  assert.doesNotMatch(reports, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(280px,30%\)\]/);
  assert.match(reports, /reportSubmissionCard/);
  assert.match(reports, /featured\.length > 0 \? <div className="mt-5 grid gap-5 lg:grid-cols-3">/);
  assert.match(form, /Additional details \(optional\)/);
});

test("incident images fail closed to compact intentional fallbacks", async () => {
  const layout = await source("src/components/site/public-layout.tsx");
  assert.match(layout, /onError=\{\(\) => setFailedUrl\(imageUrl\)\}/);
  assert.match(layout, /No image supplied/);
  assert.match(layout, /object-contain/);
});

test("ecosystem discovery uses coordinated three-card sections and verified destinations", async () => {
  const ecosystem = await source("src/components/site/mjengo-previews.tsx");
  assert.match(ecosystem, /Mjengo Hub Home &amp; Media/);
  assert.match(ecosystem, /Mjengo Hub Articles/);
  assert.match(ecosystem, /Project Tracker/);
  assert.match(ecosystem, /Mjengo Networks/);
  assert.match(ecosystem, /Jobs, Tenders, Events &amp; Joining/);
  assert.match(ecosystem, /Suppliers &amp; Get a Quote/);
  for (const path of ["https:\/\/mjengohub.co.ke\/media", "https:\/\/mjengonetworks.co.ke\/jobs-tenders", "https:\/\/mjengonetworks.co.ke\/events", "https:\/\/mjengonetworks.co.ke\/quote"]) assert.match(ecosystem, new RegExp(path));
});
