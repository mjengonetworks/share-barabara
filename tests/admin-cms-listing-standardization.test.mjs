import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

const listingRoutes = [
  "articles",
  "alerts",
  "reports",
  "campaigns",
  "infrastructure-issues",
];

test("all primary admin listings use the shared full-width surface and management header", async () => {
  for (const name of listingRoutes) {
    const source = await read(`src/routes/_authenticated/admin/${name}.tsx`);
    assert.match(source, /AdminListingSurface/);
    assert.match(source, /Manage (Articles|Alerts|Accident Reports|Campaigns|Infrastructure Issues)/);
    assert.match(source, /image_url/);
    assert.match(source, /odd:bg-background/);
    assert.match(source, /even:bg-muted/);
  }
});

test("admin listing controls use compact responsive filter grids and appropriate create actions", async () => {
  const [articles, alerts, reports, campaigns, infrastructure] = await Promise.all(
    listingRoutes.map((name) => read(`src/routes/_authenticated/admin/${name}.tsx`)),
  );
  assert.match(articles, /Add New Article/);
  assert.match(alerts, /Add New Alert/);
  assert.match(reports, /Add New Report/);
  assert.match(campaigns, /Add New Campaign/);
  assert.match(articles, /lg:grid-cols-\[auto_auto_minmax\(16rem,1fr\)\]/);
  assert.match(alerts, /lg:grid-cols-\[auto_auto_auto_minmax\(16rem,1fr\)\]/);
  assert.match(reports, /lg:grid-cols-\[auto_auto_auto_minmax\(16rem,1fr\)\]/);
  assert.match(infrastructure, /lg:grid-cols-\[auto_auto_minmax\(16rem,1fr\)\]/);
});

test("shared listing primitives provide restrained thumbnails and mobile-safe rows", async () => {
  const listing = await read("src/components/admin/admin-listing-surface.tsx");
  assert.match(listing, /AdminListingThumbnail/);
  assert.match(listing, /object-cover/);
  assert.match(listing, /aria-label=/);
  assert.match(listing, /w-full/);
  assert.match(listing, /min-w-0/);
});

test("admin listing changes stay isolated from public editorial surfaces", async () => {
  const { output } = await new Promise((resolve, reject) => {
    const child = Bun.spawn(["git", "diff", "--name-only"], { stdout: "pipe", stderr: "pipe" });
    Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]).then(async ([stdout, stderr]) => {
      const exitCode = await child.exited;
      resolve({ output: `${stdout}\n${stderr}\nexit=${exitCode}` });
    }).catch(reject);
  });
  assert.doesNotMatch(output, /src\/routes\/news|src\/components\/site\/global-editorial-preview|src\/components\/site\/public-layout/);
});
