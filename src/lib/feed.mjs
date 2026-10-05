const MAX_BODY_LENGTH = 4000;
const MAX_HASHTAGS = 8;

export function normalizeFeedBody(value) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_BODY_LENGTH);
}

export function extractFeedHashtags(body) {
  const tags = String(body ?? "").match(/#[\p{L}\p{N}_-]{2,50}/gu) ?? [];
  return [...new Set(tags.map((tag) => tag.slice(1).toLowerCase()))].slice(0, MAX_HASHTAGS);
}

export function feedSort(rows, sort = "new") {
  return [...rows].sort((a, b) => {
    if (sort === "top" || sort === "popular") return (b.score ?? 0) - (a.score ?? 0) || String(b.created_at).localeCompare(String(a.created_at));
    if (sort === "hot" || sort === "trending") return ((b.score ?? 0) + (b.comment_count ?? 0) * 2) - ((a.score ?? 0) + (a.comment_count ?? 0) * 2) || String(b.created_at).localeCompare(String(a.created_at));
    return String(b.created_at).localeCompare(String(a.created_at));
  });
}

export function trendCounts(rows) {
  const counts = new Map();
  for (const row of rows) for (const tag of row.hashtags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map(([tag, count]) => ({ tag, count }));
}

export const FEED_LIMIT = 30;
