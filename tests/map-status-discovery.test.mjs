import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("road map exposes an accessible light/dark MapLibre style toggle", async () => {
  const source = await read("src/components/site/road-geometry-map.tsx");
  assert.match(source, /maplibre-gl/);
  assert.match(source, /tiles\.openfreemap\.org\/styles\/liberty/);
  assert.match(source, /tiles\.openfreemap\.org\/styles\/dark/);
  assert.match(source, /aria-label=\"Map style\"/);
  assert.match(source, /aria-pressed=\{mode === option\}/);
  assert.match(source, /FullscreenControl/);
  assert.match(source, /Verified road geometry is not available yet/);
});

test("alert status is a clickable discovery filter and legacy status remains grouped", async () => {
  const detail = await read("src/routes/alerts.$alertId.tsx");
  const index = await read("src/routes/alerts.index.tsx");
  assert.match(detail, /search=\{\{ status: alert\.status === \"under_resolution\" \? \"in_progress\"/);
  assert.match(detail, /publicStatus \? <Link/);
  assert.match(index, /status === \"in_progress\" \? a\.status === \"in_progress\" \|\| a\.status === \"under_resolution\"/);
  assert.match(index, /status !== \"all\"/);
});
