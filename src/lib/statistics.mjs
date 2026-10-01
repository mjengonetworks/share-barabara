/** Pure statistics rules shared by the public page and regression tests. */
export function isApprovedReport(row) {
  return row?.status === "approved";
}

export function sumKnown(values) {
  return values.reduce(
    (result, value) =>
      value === null || value === undefined
        ? { value: result.value, hasUnknown: true }
        : { value: result.value + value, hasUnknown: result.hasUnknown },
    { value: 0, hasUnknown: false },
  );
}

export function percentageChange(current, prior) {
  if (prior === 0 || prior === null || prior === undefined) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

export function reportMonthBuckets(rows, year) {
  return Array.from({ length: 12 }, (_, month) => {
    const inMonth = rows.filter((row) => {
      const date = new Date(row.occurred_at);
      return date.getFullYear() === year && date.getMonth() === month;
    });
    return {
      month,
      reports: inMonth.length,
      fatalities: sumKnown(inMonth.map((row) => row.fatalities)),
      injuries: sumKnown(inMonth.map((row) => row.casualties)),
    };
  });
}
