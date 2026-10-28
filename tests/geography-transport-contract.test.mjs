import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("transport contract defines stable multimodal values without implying persistence", async () => {
  const source = await readFile(new URL("../src/lib/transport-safety.ts", import.meta.url), "utf8");
  for (const value of ["road", "rail", "aviation", "maritime_water", "other_multimodal"]) {
    assert.match(source, new RegExp(`value: "${value}"`));
  }
  assert.match(source, /Persistence is[\s\S]*pending/);
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
