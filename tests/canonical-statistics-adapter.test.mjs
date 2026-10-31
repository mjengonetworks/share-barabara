import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const adapter = readFileSync("src/lib/canonical-statistics.ts", "utf8");
const route = readFileSync("src/routes/statistics.tsx", "utf8");

test("statistics adapter prefers canonical RPC and has a safe report-only fallback", () => {
  assert.match(adapter, /public_canonical_transport_statistics/);
  assert.match(adapter, /reports-fallback/);
  assert.match(adapter, /from\("accident_reports"\)/);
  assert.match(adapter, /status/, "fallback must remain approved-report-only");
  assert.match(adapter, /does not exist|PGRST202|schema cache/);
  assert.doesNotMatch(adapter, /from\("alerts"\)/, "fallback must not aggregate Alert casualties");
  assert.match(adapter, /country_code: null/, "fallback must not infer Kenya for legacy rows");
  assert.match(adapter, /transportMode && filter\.transportMode !== "road"/);
});

test("statistics route consumes the adapter and exposes transport-mode filtering", () => {
  assert.match(route, /loadLiveCanonicalIncidents/);
  assert.match(route, /useLiveYearReports\(liveTransportMode, activeYear\)/);
  assert.match(route, /public canonical verified incidents|canonical verified incidents/);
  for (const mode of ["road", "rail", "aviation", "maritime", "inland_water", "other"]) {
    assert.match(route, new RegExp(`value=\\"${mode}\\"`));
  }
});

test("statistics does not request Report-only duplicate identity from Alerts", () => {
  assert.match(route, /table === "accident_reports" \? `\$\{column\}, duplicate_of_report_id` : column/);
  assert.match(route, /Duplicate identity is an Accident Report concern/);
});

test("statistics uses the existing canonical road RPC before the optional transport extension", () => {
  assert.match(adapter, /public_canonical_accident_statistics/);
  assert.match(adapter, /!filter\.transportMode \|\| filter\.transportMode === "road"/);
  assert.match(adapter, /Non-road modes require the reviewed transport extension/);
  assert.match(adapter, /if \(error && isMissingCanonicalRpc\(error\)\) return \[\]/);
});

test("the map adapter uses the canonical map RPC and excludes coordinate-less rows", () => {
  assert.match(adapter, /public_canonical_transport_map/);
  assert.match(adapter, /_from: filter\.from/);
  assert.match(adapter, /_admin_area: filter\.adminArea/);
  assert.match(adapter, /_transport_corridor: filter\.transportCorridor/);
  assert.match(adapter, /latitude !== null && row\.longitude !== null/);
  assert.match(adapter, /report_id/);
  assert.match(adapter, /alert_id/);
});

test("statistics page uses filtered deduplicated rows for a clustered MapLibre map", () => {
  assert.match(route, /StatisticsIncidentMap/);
  assert.match(route, /rows=\{thisYearSummary\.rows\}/);
  assert.match(route, /liveRoad/);
  assert.match(route, /liveVehicle/);
  assert.match(route, /roadOptions/);
  assert.match(route, /vehicleOptions/);
  assert.match(readFileSync("src/components/site/statistics-incident-map.tsx", "utf8"), /cluster: true/);
  assert.match(readFileSync("src/components/site/statistics-incident-map.tsx", "utf8"), /Exploratory place search/);
});
