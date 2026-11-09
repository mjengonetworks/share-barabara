import { supabase } from "@/integrations/supabase/client";
import type { UnifiedFeedItem, UnifiedFeedKind } from "@/lib/unified-feed";

export type MostViewedTab = "alerts" | "articles" | "reports";
export type MostViewedRow = Record<string, unknown> & { id: string; title?: string | null };

const rpcFor: Record<MostViewedTab, string> = {
  alerts: "trending_alerts",
  articles: "trending_news",
  reports: "trending_reports",
};

const stringValue = (row: MostViewedRow, key: string) =>
  typeof row[key] === "string" ? (row[key] as string) : null;

export const hoursForRange: Record<string, number> = {
  "12h": 12,
  "24h": 24,
  "7d": 24 * 7,
  month: 24 * 31,
  year: 24 * 366,
};

export async function fetchMostViewed(tab: MostViewedTab, hoursBack: number, limit = 30) {
  const { data, error } = await supabase.rpc(rpcFor[tab], {
    hours_back: hoursBack,
    result_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as MostViewedRow[]).filter((row) => {
    if (tab === "alerts") return stringValue(row, "status") === "active";
    if (tab === "articles") return stringValue(row, "status") === "published";
    return stringValue(row, "status") === "approved";
  });
}

export function mostViewedToFeedItem(tab: MostViewedTab, row: MostViewedRow): UnifiedFeedItem {
  const kind: UnifiedFeedKind =
    tab === "alerts" ? "alert" : tab === "articles" ? "article" : "report";
  const createdAt =
    stringValue(
      row,
      tab === "reports" ? "occurred_at" : tab === "articles" ? "published_at" : "created_at",
    ) ??
    stringValue(row, "created_at") ??
    "";
  const title = stringValue(row, "title") ?? "Published Share Barabara update";
  const body = stringValue(row, "summary") ?? stringValue(row, "description") ?? "";
  const slug = stringValue(row, "slug");
  return {
    key: `${kind}:${row.id}`,
    kind,
    label: tab === "alerts" ? "Road Alert" : tab === "articles" ? "Article" : "Accident Report",
    sourceId: row.id,
    title,
    body,
    location: stringValue(row, "county") ?? stringValue(row, "road"),
    href:
      tab === "alerts"
        ? `/alerts/${row.id}`
        : tab === "articles"
          ? `/news/${slug ?? row.id}`
          : `/reports/${row.id}`,
    imageUrl: stringValue(row, "image_url"),
    mediaUrl: null,
    authorId: stringValue(row, "user_id") ?? stringValue(row, "author_id"),
    createdAt,
    publishedAt: tab === "reports" ? createdAt : (stringValue(row, "published_at") ?? createdAt),
    updatedAt: stringValue(row, "updated_at"),
    status: stringValue(row, "status"),
    moderationStatus: stringValue(row, "moderation_status"),
    hashtags: [],
    media: [],
  };
}

export async function fetchMostViewedTaxonomy(tab: MostViewedTab) {
  if (tab === "articles") {
    const { data, error } = await supabase
      .from("news")
      .select("category, categories")
      .eq("status", "published")
      .limit(1000);
    if (error) throw error;
    return Array.from(
      new Set(
        (data ?? []).flatMap(
          (row) => [row.category, ...(row.categories ?? [])].filter(Boolean) as string[],
        ),
      ),
    ).sort();
  }
  if (tab === "alerts") {
    const { data, error } = await supabase
      .from("alerts")
      .select("hazard_type")
      .eq("status", "active")
      .limit(1000);
    if (error) throw error;
    return Array.from(
      new Set((data ?? []).map((row) => row.hazard_type).filter(Boolean) as string[]),
    ).sort();
  }
  const { data, error } = await supabase
    .from("accident_reports")
    .select("severity, incident_type")
    .eq("status", "approved")
    .limit(1000);
  if (error) throw error;
  return Array.from(
    new Set(
      (data ?? []).flatMap((row) => [row.severity, row.incident_type].filter(Boolean) as string[]),
    ),
  ).sort();
}
