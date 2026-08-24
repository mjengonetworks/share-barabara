export const LEVELS = [
  { level: 1, min: 0, max: 49, icon: "•" },
  { level: 2, min: 50, max: 99, icon: "•" },
  { level: 3, min: 100, max: 199, icon: "◆" },
  { level: 4, min: 200, max: 499, icon: "◆" },
  { level: 5, min: 500, max: 999, icon: "◆" },
  { level: 6, min: 1000, max: 4999, icon: "★" },
  { level: 7, min: 5000, max: 9999, icon: "★" },
  { level: 8, min: 10000, max: 19999, icon: "✦" },
  { level: 9, min: 20000, max: 99999, icon: "✦" },
  { level: 10, min: 100000, max: Infinity, icon: "♛" },
] as const;

export function levelForStars(totalStars: number) {
  return LEVELS.find((l) => totalStars >= l.min && totalStars <= l.max) ?? LEVELS[0];
}

export const BADGE_THRESHOLDS = [
  { points: 1000, label: "Gold contributor", tier: "gold" },
  { points: 500, label: "Silver contributor", tier: "silver" },
  { points: 200, label: "Bronze contributor", tier: "bronze" },
  { points: 100, label: "Rising contributor", tier: "bronze" },
] as const;

export function badgeForPoints(points: number) {
  return BADGE_THRESHOLDS.find((b) => points >= b.points) ?? null;
}
