import type { EditorialMode, EditorialValue } from "./editorial.functions";

function isEmptyEditorialValue(value: EditorialValue | undefined) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function mayFillField(field: string, value: EditorialValue | undefined) {
  if (["vehicles_involved", "casualties", "fatalities"].includes(field) && value === null)
    return false;
  return isEmptyEditorialValue(value);
}

export function filterEditorialDraftForApply(
  proposed: Record<string, EditorialValue>,
  latest: Record<string, EditorialValue> | undefined,
  snapshot: Record<string, EditorialValue> | undefined,
  mode: EditorialMode,
) {
  const unchanged = Object.fromEntries(
    Object.entries(proposed).filter(([field]) => {
      if (!latest || !snapshot || !(field in latest) || !(field in snapshot)) return true;
      const left = latest[field];
      const right = snapshot[field];
      return (
        Object.is(left, right) ||
        (typeof left === "object" &&
          typeof right === "object" &&
          left !== null &&
          right !== null &&
          JSON.stringify(left) === JSON.stringify(right))
      );
    }),
  ) as Record<string, EditorialValue>;
  if (mode === "update" || !latest) return unchanged;
  return Object.fromEntries(
    Object.entries(unchanged).filter(([field]) => mayFillField(field, latest[field])),
  ) as Record<string, EditorialValue>;
}
