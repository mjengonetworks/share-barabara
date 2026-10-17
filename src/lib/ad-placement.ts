export type AdPlacement<T> =
  { kind: "content"; item: T; index: number } | { kind: "ad"; slot: number };

export function isAdInterval(position: number): boolean {
  return position > 0 && position % 4 === 0;
}

/**
 * Interleave an ad marker after each fourth real item. The offset lets callers
 * continue the count across pages or an infinite-scroll batch; ad markers are
 * never counted as content.
 */
export function withAdPlacements<T>(items: readonly T[], offset = 0): AdPlacement<T>[] {
  const placements: AdPlacement<T>[] = [];
  items.forEach((item, index) => {
    const position = offset + index + 1;
    placements.push({ kind: "content", item, index });
    if (isAdInterval(position)) placements.push({ kind: "ad", slot: position / 4 });
  });
  return placements;
}
