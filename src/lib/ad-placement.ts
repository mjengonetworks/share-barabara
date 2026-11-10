export type AdPlacement<T> =
  { kind: "content"; item: T; index: number } | { kind: "ad"; slot: number };

export type ResponsiveAdPlacement<T> =
  | { kind: "content"; item: T; index: number }
  | { kind: "ad"; slot: number; visibility: "all" | "tablet" | "mobile-desktop" };

export function isAdInterval(position: number): boolean {
  // Public content grids are three columns on desktop: two complete rows are
  // six cards. The same six-card interval is retained on mobile so an ad does
  // not interrupt the first screenful of a listing.
  return position > 0 && position % 6 === 0;
}

/**
 * Interleave an ad marker after each sixth real item. The offset lets callers
 * continue the count across pages or an infinite-scroll batch; ad markers are
 * never counted as content.
 */
export function withAdPlacements<T>(items: readonly T[], offset = 0): AdPlacement<T>[] {
  const placements: AdPlacement<T>[] = [];
  items.forEach((item, index) => {
    const position = offset + index + 1;
    placements.push({ kind: "content", item, index });
    if (isAdInterval(position)) placements.push({ kind: "ad", slot: position / 6 });
  });
  return placements;
}

/**
 * Responsive listing grids use two columns from sm through lg and three from
 * lg upward. Emit one visible marker per breakpoint without placing two ads at
 * the same viewport width: four cards for the tablet two-column grid, and six
 * cards for mobile or the desktop three-column grid.
 */
export function withResponsiveAdPlacements<T>(
  items: readonly T[],
  offset = 0,
  layout: "sm-2-lg-3" | "md-3" = "sm-2-lg-3",
): ResponsiveAdPlacement<T>[] {
  const placements: ResponsiveAdPlacement<T>[] = [];
  items.forEach((item, index) => {
    const position = offset + index + 1;
    placements.push({ kind: "content", item, index });
    if (layout === "md-3") {
      if (position > 0 && position % 6 === 0) {
        placements.push({ kind: "ad", slot: position / 6, visibility: "all" });
      }
      return;
    }
    if (position > 0 && position % 4 === 0) {
      placements.push({ kind: "ad", slot: position / 4, visibility: "tablet" });
    }
    if (position > 0 && position % 6 === 0) {
      placements.push({ kind: "ad", slot: position / 6, visibility: "mobile-desktop" });
    }
  });
  return placements;
}
