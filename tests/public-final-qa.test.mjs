import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public date formatting is explicitly Africa/Nairobi based", async () => {
  const format = await read("src/lib/format.ts");
  assert.equal((format.match(/timeZone: "Africa\/Nairobi"/g) ?? []).length, 4);
  assert.match(format, /export function dateTime/);
});

test("public compatibility and privacy contracts remain intact", async () => {
  const [media, header, root, feed, reports] = await Promise.all([
    read("src/routes/media.tsx"),
    read("src/components/site/site-header.tsx"),
    read("src/routes/__root.tsx"),
    read("src/routes/feed.tsx"),
    read("src/routes/reports.index.tsx"),
  ]);
  assert.match(media, /redirect\(\{ to: "\/feed" \}\)/);
  assert.match(header, /label: "Media & Feed"/);
  assert.doesNotMatch(header, /label: "Contributors"/);
  assert.match(root, /isAdminApp/);
  assert.match(feed, /published|public/i);
  assert.match(reports, /displayReportCount\(r\.fatalities\)/);
});

test("public saved-chat timestamps use the shared Nairobi formatter", async () => {
  const dashboard = await read("src/routes/_authenticated/dashboard.tsx");
  assert.match(dashboard, /dateTime\(chat\.updated_at\)/);
  assert.doesNotMatch(dashboard, /new Date\(chat\.updated_at\)\.toLocaleString\(\)/);
});
