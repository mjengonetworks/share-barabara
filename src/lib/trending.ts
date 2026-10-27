export function selectRankedUnique<T extends { id: string }>(
  ranked: readonly T[],
  excludedIds: ReadonlySet<string>,
  limit = 3,
): T[] {
  const seen = new Set(excludedIds);
  const selected: T[] = [];
  for (const item of ranked) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    selected.push(item);
    if (selected.length === limit) break;
  }
  return selected;
}
