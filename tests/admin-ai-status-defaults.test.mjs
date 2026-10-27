import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(file, "utf8");

test("all primary admin content listings default to All statuses", async () => {
  const files = [
    "src/routes/_authenticated/admin/articles.tsx",
    "src/routes/_authenticated/admin/reports.tsx",
    "src/routes/_authenticated/admin/infrastructure-issues.tsx",
    "src/routes/_authenticated/admin/campaigns.tsx",
    "src/routes/_authenticated/admin/alerts.tsx",
    "src/routes/_authenticated/admin/videos.tsx",
    "src/routes/_authenticated/admin/feed.tsx",
  ];
  const sources = await Promise.all(files.map(read));
  assert.match(sources[0], /useState<Status \| "all">\("all"\)/);
  assert.match(sources[1], /useState<Status \| "all">\("all"\)/);
  assert.match(sources[2], /useState<Status \| "all">\("all"\)/);
  assert.match(sources[3], /useState\("all"\)/);
  assert.match(sources[4], /const \[status, setStatus\] = useState\("all"\)/);
  assert.match(sources[5], /const \[statusFilter, setStatusFilter\] = useState\("all"\)/);
  assert.match(sources[6], /const \[postStatus, setPostStatus\] = useState\("all"\)/);
  for (const source of sources) assert.match(source, /All statuses/);
});

test("admin Add forms explicitly enable authorized editorial AI controls", async () => {
  const alert = await read("src/components/site/alert-form.tsx");
  const report = await read("src/components/site/report-form.tsx");
  const alertRoute = await read("src/routes/_authenticated/admin/alerts.tsx");
  const reportRoute = await read("src/routes/_authenticated/admin/reports.tsx");
  assert.match(alert, /editorial = false/);
  assert.match(report, /editorial = false/);
  assert.match(alert, /const editorialAccess = editorial \|\| canReview/);
  assert.match(report, /const editorialAccess = editorial \|\| canReview/);
  assert.match(alertRoute, /<AlertForm editorial/);
  assert.match(reportRoute, /<ReportForm editorial/);
});

test("status filtering applies before rendering alert rows", async () => {
  const alerts = await read("src/routes/_authenticated/admin/alerts.tsx");
  assert.match(alerts, /if \(status !== "all" && a\.status !== status\) return false/);
  assert.match(alerts, /value=\{status\} onValueChange=\{setStatus\}/);
  assert.match(alerts, /<SelectItem value="pending">|<SelectItem value="active">/);
});
