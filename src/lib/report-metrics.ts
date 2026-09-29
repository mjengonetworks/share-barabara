export type NullableReportCount = number | null;

export function parseNullableCount(raw: string): NullableReportCount {
  const value = raw.trim();
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function displayReportCount(value: NullableReportCount): string {
  return value === null ? "Not confirmed" : String(value);
}

export function knownReportSum(values: NullableReportCount[]) {
  return values.reduce(
    (result, value) =>
      value === null
        ? { ...result, hasUnknown: true }
        : { ...result, value: result.value + value },
    { value: 0, hasUnknown: false },
  );
}
