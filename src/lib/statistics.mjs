/** Pure statistics rules shared by the public page and regression tests. */
export function isApprovedReport(row) {
  return row?.status === "approved";
}

export function sumKnown(values) {
  return values.reduce(
    (result, value) =>
      value === null || value === undefined || !Number.isFinite(value)
        ? { value: result.value, hasUnknown: true }
        : { value: result.value + value, hasUnknown: result.hasUnknown },
    { value: 0, hasUnknown: false },
  );
}

/** Exclude only reports explicitly linked to a canonical report after review. */
export function excludeLinkedDuplicates(rows) {
  return rows.filter((row) => {
    const linkedId = row?.duplicate_of_report_id ?? row?.duplicateOfReportId;
    return linkedId === null || linkedId === undefined || linkedId === "";
  });
}

export function summarizeIncidentRows(rows) {
  const eligibleRows = excludeLinkedDuplicates(rows);
  const fatalities = sumKnown(eligibleRows.map((row) => row?.fatalities));
  const injuries = sumKnown(eligibleRows.map((row) => row?.casualties ?? row?.injuries));
  return {
    incidents: eligibleRows.length,
    confirmedFatalities: fatalities.value,
    unknownFatalities: eligibleRows.filter((row) => row?.fatalities === null || row?.fatalities === undefined).length,
    confirmedInjuries: injuries.value,
    unknownInjuries: eligibleRows.filter((row) => (row?.casualties ?? row?.injuries) === null || (row?.casualties ?? row?.injuries) === undefined).length,
    rows: eligibleRows,
  };
}

export function groupIncidentRows(rows, field, unknownLabel = "Unknown / not specified") {
  return rows.reduce((groups, row) => {
    const raw = row?.[field];
    const key = raw === null || raw === undefined || String(raw).trim() === "" ? unknownLabel : String(raw);
    groups[key] = (groups[key] ?? 0) + 1;
    return groups;
  }, {});
}

export function percentageChange(current, prior) {
  if (prior === 0 || prior === null || prior === undefined) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

export function reportMonthBuckets(rows, year) {
  const eligibleRows = excludeLinkedDuplicates(rows);
  return Array.from({ length: 12 }, (_, month) => {
    const inMonth = eligibleRows.filter((row) => {
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
