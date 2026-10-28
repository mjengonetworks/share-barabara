import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

const listingRoutes = ["articles", "alerts", "reports", "campaigns", "infrastructure-issues"];

test("all primary admin listings use the deployed shared page and full-width surface", async () => {
  for (const name of listingRoutes) {
    const source = await read(`src/routes/_authenticated/admin/${name}.tsx`);
    assert.match(source, /AdminPageHeader|<h1/);
    assert.match(source, /title="Manage [^"]+"|title="Hazard alerts"|<h1[^>]*>Manage /);
    assert.match(source, /AdminListingSurface/);
    assert.match(source, /image_url|attachments|evidence/);
  }
});

test("admin listing controls use compact responsive filter grids and appropriate create actions", async () => {
  const [articles, alerts, reports, campaigns, infrastructure] = await Promise.all(
    listingRoutes.map((name) => read(`src/routes/_authenticated/admin/${name}.tsx`)),
  );
  assert.match(articles, /Add New Article/);
  assert.match(alerts, /Add (?:New|new) alert/);
  assert.match(reports, /Add New Report/);
  assert.match(campaigns, /Add New Campaign/);
  for (const source of [articles, reports, infrastructure]) {
    assert.match(source, /lg:grid-cols/);
    assert.match(source, /Search/);
  }
});

test("admin listings use consistent compact thumbnails and place search after filters", async () => {
  const sources = await Promise.all(
    listingRoutes.map((name) => read(`src/routes/_authenticated/admin/${name}.tsx`)),
  );
  for (const source of sources.filter((_, index) => index !== 1)) {
    assert.match(source, /h-12 w-\[70px\]/);
  }
  for (const source of sources.filter((_, index) => index !== 1)) {
    assert.match(source, /sm:col-span-2 lg:col-span-4/);
  }
});

test("shared listing primitives provide the deployed surface and mobile-safe boundaries", async () => {
  const listing = await read("src/components/admin/admin-listing-surface.tsx");
  // The current production admin commit keeps content-specific table columns
  // in each route; the shared primitive owns the border, width and row surface.
  assert.match(listing, /AdminListingSurface/);
  assert.match(listing, /AdminListingHeader/);
  assert.match(listing, /w-full/);
  assert.match(listing, /overflow-x-auto/);
  assert.match(listing, /whitespace-nowrap/);
});

test("admin listing implementation remains intact while scoped public discovery work is allowed", async () => {
  const output = execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" });
  assert.doesNotMatch(output, /src\/routes\/news|src\/components\/site\/global-editorial-preview/);
  const allowedPublicChanges = new Set([
    "src/components/site/public-layout.tsx",
    "src/components/site/report-form.tsx",
    "src/lib/storage.ts",
    // Shared location, but admin-only functionality; it is not mounted on
    // public editorial routes.
    "src/components/site/cross-content-editor.tsx",
    "src/routes/reports.$reportId.tsx",
    "src/routes/reports.index.tsx",
  ]);
  for (const file of output.split(/\r?\n/).filter(Boolean)) {
    if (file.startsWith("src/") && !file.includes("/_authenticated/admin/") && !allowedPublicChanges.has(file)) {
      assert.fail(`unexpected public-surface change: ${file}`);
    }
  }
});
