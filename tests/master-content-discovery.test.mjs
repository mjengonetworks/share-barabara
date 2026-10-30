import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("report and alert directories use the shared editorial header and URL-backed filters", async () => {
  const [layout, reports, alerts] = await Promise.all([
    read("src/components/site/public-layout.tsx"),
    read("src/routes/reports.index.tsx"),
    read("src/routes/alerts.index.tsx"),
  ]);
  assert.match(layout, /export function SectionHeader/);
  for (const source of [reports, alerts]) {
    assert.match(source, /<SectionHeader/);
    assert.match(source, /useNavigate/);
    assert.match(source, /search: \(previous[^)]*\) =>/);
    assert.match(source, /Clear all filters/);
    assert.match(source, /EditorialBand/);
  }
  assert.match(reports, /road\?: string/);
  assert.match(alerts, /road\?: string/);
});

test("detail metadata exposes canonical county, road, incident and classification links", async () => {
  const [report, alert, cards] = await Promise.all([
    read("src/routes/reports.$reportId.tsx"),
    read("src/routes/alerts.$alertId.tsx"),
    read("src/components/site/discovery-sections.tsx"),
  ]);
  assert.match(report, /search=\{\{ county: report\.county \}\s+as never\}/);
  assert.match(report, /search=\{\{ county: report\.county, road: report\.road_id/);
  assert.match(report, /search=\{\{ incident: reportIncidentType/);
  assert.match(report, /search=\{\{ severity: report\.severity/);
  assert.match(alert, /search=\{\{ county: alert\.county \}\s+as never\}/);
  assert.match(alert, /search=\{\{ county: alert\.county, road: alert\.road_id/);
  assert.match(alert, /search=\{\{ hazard: alert\.hazard_type/);
  assert.match(cards, /search=\{\{ incident: report\.incident_type \}\}/);
  assert.match(cards, /search=\{\{ hazard: alert\.hazard_type \}\}/);
});

test("public discovery preserves eligibility boundaries and distinct hierarchy", async () => {
  const [reports, alerts] = await Promise.all([
    read("src/routes/reports.index.tsx"),
    read("src/routes/alerts.index.tsx"),
  ]);
  for (const source of [reports, alerts]) {
    assert.match(source, /Latest/);
    assert.match(source, /Featured/);
    assert.match(source, /Trending/);
    assert.match(source, /GlobalEditorialPreview/);
    assert.match(source, /EditorialDiscoveryRail/);
    assert.match(source, /IncidentEntityGroups/);
  }
  assert.match(reports, /\.eq\("status", "approved"\)/);
  assert.match(alerts, /\.or\("status\.is\.null,status\.in\.\(active,in_progress,resolved,under_resolution\)"\)/);
});

test("detail order keeps location before headline and media fluid", async () => {
  const [report, alert] = await Promise.all([
    read("src/routes/reports.$reportId.tsx"),
    read("src/routes/alerts.$alertId.tsx"),
  ]);
  for (const source of [report, alert]) {
    const view = source.slice(source.indexOf("<article"));
    assert.ok(view.indexOf("<MapPin") < view.indexOf("<h1"));
    assert.match(source, /block h-auto max-h-\[70vh\] max-w-full w-full/);
    assert.doesNotMatch(source, /Publication date:/);
  }
});
