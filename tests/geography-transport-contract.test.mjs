import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("transport contract matches canonical statistics mode identifiers", async () => {
  const source = await readFile(new URL("../src/lib/transport-safety.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261028150000_unified_geography_transport_schema.sql", import.meta.url), "utf8");
  for (const value of ["road", "rail", "aviation", "maritime", "inland_water", "other"]) {
    assert.match(source, new RegExp(`value: "${value}"`));
    assert.match(migration, new RegExp(`'${value}'`));
  }
  assert.match(migration, /ALTER TABLE public\.accident_reports/);
  assert.match(migration, /content_geography/);
  assert.match(migration, /transport_entity_aliases/);
  assert.match(migration, /canonical_accident_incidents/);
  assert.match(migration, /canonical_incident_transport_modes/);
  assert.match(migration, /admin_area_id TEXT REFERENCES public\.admin_areas/);
  assert.match(migration, /transport_entity_id UUID REFERENCES public\.transport_entities/);
});

test("road autocomplete supports canonical IDs, keyboard selection and alias-safe name/slug search", async () => {
  const hook = await readFile(new URL("../src/hooks/useRoadSuggestions.ts", import.meta.url), "utf8");
  const input = await readFile(new URL("../src/components/site/road-input.tsx", import.meta.url), "utf8");
  assert.match(hook, /name\.ilike.*slug\.ilike/);
  assert.match(input, /onRoadIdChange/);
  assert.match(input, /ArrowDown/);
  assert.match(input, /role="listbox"/);
  assert.match(input, /role="combobox"/);
});

test("existing report and alert forms persist selected canonical road IDs", async () => {
  const editor = await readFile(new URL("../src/components/admin/editorial-record-editor.tsx", import.meta.url), "utf8");
  const alert = await readFile(new URL("../src/components/site/alert-form.tsx", import.meta.url), "utf8");
  assert.match(editor, /road_id: stringValue\(record, "road_id"\)/);
  assert.match(editor, /road_id: form\.road_id/);
  assert.match(alert, /road_id: null as string \| null/);
  assert.match(alert, /road_id = form\.road_id/);
});

test("country and transport controls are feature-gated until the additive schema exists", async () => {
  const countries = await readFile(new URL("../src/lib/countries.ts", import.meta.url), "utf8");
  const gate = await readFile(new URL("../src/hooks/useUnifiedGeographySchema.ts", import.meta.url), "utf8");
  const fields = await readFile(new URL("../src/components/admin/geography-fields.tsx", import.meta.url), "utf8");
  assert.match(countries, /code: string/);
  assert.match(countries, /KE/);
  assert.match(gate, /countries/);
  assert.match(gate, /admin_areas/);
  assert.match(gate, /transport_entities/);
  assert.match(fields, /Existing road and county fields remain active/);
});

test("mode-specific transport entities are queried by canonical type", async () => {
  const selector = await readFile(new URL("../src/components/admin/transport-entity-selector.tsx", import.meta.url), "utf8");
  const proposal = await readFile(new URL("../docs/unified-geography-transport-contract.md", import.meta.url), "utf8");
  assert.match(selector, /transport_entities/);
  assert.match(selector, /ENTITY_TYPES/);
  assert.match(selector, /railway/);
  assert.match(selector, /airport/);
  assert.match(proposal, /No step should rewrite historical location values/);
});

test("country and region persistence uses stable IDs without historical Kenya backfill", async () => {
  const editor = await readFile(new URL("../src/components/admin/editorial-record-editor.tsx", import.meta.url), "utf8");
  const fields = await readFile(new URL("../src/components/admin/geography-fields.tsx", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261028150000_unified_geography_transport_schema.sql", import.meta.url), "utf8");
  assert.match(editor, /isNew \? "KE"/);
  assert.match(editor, /admin_area_id: isNew \? "" : stringValue\(record, "admin_area_id"\)/);
  assert.match(fields, /admin_area_name/);
  assert.match(migration, /KE-047/);
  assert.match(migration, /No historical backfill/);
});

test("schema candidate is additive and protects reference data with RLS", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20261028150000_unified_geography_transport_schema.sql", import.meta.url), "utf8");
  assert.doesNotMatch(migration, /DROP\s+(TABLE|COLUMN|SCHEMA)/i);
  assert.doesNotMatch(migration, /UPDATE\s+public\.(accident_reports|alerts|news|campaigns|infrastructure_issues)/i);
  for (const table of ["countries", "admin_areas", "transport_entities", "content_geography", "content_transport_modes"]) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  }
  assert.match(migration, /has_min_role\(auth\.uid\(\),\s*'editor'\)/);
  assert.match(migration, /CREATE POLICY unified_content_geography_editor_read/);
});
