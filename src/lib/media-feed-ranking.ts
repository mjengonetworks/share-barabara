import type { UnifiedFeedItem } from "@/lib/unified-feed";

export type FeedViewEvent = {
  activityKey: string;
  viewedAt: string;
};

export type MediaFeedGroups = {
  latest: UnifiedFeedItem[];
  twelveHours: UnifiedFeedItem[];
  twentyFourHours: UnifiedFeedItem[];
};

const publishedTime = (item: UnifiedFeedItem) =>
  Date.parse(item.publishedAt ?? item.createdAt) || 0;

export function latestActivities(items: UnifiedFeedItem[], limit = 3) {
  return [...items]
    .sort(
      (left, right) =>
        publishedTime(right) - publishedTime(left) || right.key.localeCompare(left.key),
    )
    .slice(0, limit);
}

export function rankActivitiesByWindow(
  items: UnifiedFeedItem[],
  events: FeedViewEvent[],
  now: string,
  hours: number,
  limit = 3,
  excludedKeys = new Set<string>(),
) {
  const nowMs = Date.parse(now);
  const startMs = nowMs - hours * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const event of events) {
    const viewedMs = Date.parse(event.viewedAt);
    if (!Number.isFinite(viewedMs) || viewedMs < startMs || viewedMs > nowMs) continue;
    counts.set(event.activityKey, (counts.get(event.activityKey) ?? 0) + 1);
  }
  return items
    .filter((item) => !excludedKeys.has(item.key) && (counts.get(item.key) ?? 0) > 0)
    .sort(
      (left, right) =>
        (counts.get(right.key) ?? 0) - (counts.get(left.key) ?? 0) ||
        publishedTime(right) - publishedTime(left) ||
        right.key.localeCompare(left.key),
    )
    .slice(0, limit);
}

export function buildMediaFeedGroups(
  items: UnifiedFeedItem[],
  events: FeedViewEvent[] | null,
  now: string,
): MediaFeedGroups {
  const latest = latestActivities(items);
  if (!events) {
    return { latest, twelveHours: [], twentyFourHours: [] };
  }
  const latestKeys = new Set(latest.map((item) => item.key));
  const twelveHours = rankActivitiesByWindow(items, events, now, 12, 3, latestKeys);
  const excluded = new Set([...latestKeys, ...twelveHours.map((item) => item.key)]);
  return {
    latest,
    twelveHours,
    twentyFourHours: rankActivitiesByWindow(items, events, now, 24, 3, excluded),
  };
}
