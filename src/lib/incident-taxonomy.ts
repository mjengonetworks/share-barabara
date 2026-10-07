export type IncidentTaxonomyRow = {
  value: string;
  label: string;
  parent_value?: string | null;
  active?: boolean;
  sort_order?: number;
};

export const THEFT_VALUE = "theft";
export const VANDALISM_VALUE = "vandalism";

export const TASK43_INCIDENT_VALUES = {
  theft: THEFT_VALUE,
  vehicleTheft: "vehicle_theft",
  motorcycleTheft: "motorcycle_theft",
  roadFurnitureTheft: "road_furniture_theft",
  vandalism: VANDALISM_VALUE,
  roadFurnitureVandalism: "road_furniture_vandalism",
} as const;

export function activeIncidentRows(rows: IncidentTaxonomyRow[]) {
  return rows.filter((row) => row.active !== false);
}

export function descendantsOf(rows: IncidentTaxonomyRow[], parentValue: string) {
  const active = activeIncidentRows(rows);
  const values = new Set([parentValue]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of active) {
      if (row.parent_value && values.has(row.parent_value) && !values.has(row.value)) {
        values.add(row.value);
        changed = true;
      }
    }
  }
  return values;
}

export function incidentLabel(
  rows: IncidentTaxonomyRow[],
  value: string | null | undefined,
) {
  return rows.find((row) => row.value === value)?.label ?? value ?? "Unclassified";
}
