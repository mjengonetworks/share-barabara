import { supabase } from "@/integrations/supabase/client";

export type UnifiedFeedKind =
  "article" | "alert" | "report" | "infrastructure" | "campaign" | "video" | "community" | "update";

export type UnifiedFeedItem = {
  key: string;
  kind: UnifiedFeedKind;
  label: string;
  sourceId: string;
  title: string;
  body: string;
  location: string | null;
  href: string;
  imageUrl: string | null;
  mediaUrl: string | null;
  authorId: string | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string | null;
  status: string | null;
  moderationStatus: string | null;
  hashtags: string[];
  media: Array<{
    id: string;
    media_type: "image" | "video";
    storage_path: string;
    filename: string;
  }>;
};

type FeedSourceRow = {
  id: string;
  [key: string]: unknown;
  author_id?: string | null;
  user_id?: string | null;
  body?: string | null;
  summary?: string | null;
  description?: string | null;
  excerpt?: string | null;
  title?: string | null;
  slug?: string | null;
  parent_type?: string | null;
  parent_id?: string | null;
  county?: string | null;
  road?: string | null;
  road_name?: string | null;
  published_at?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  image_url?: string | null;
  featured_image_url?: string | null;
  video_url?: string | null;
  status?: string | null;
  moderation_status?: string | null;
  hashtags?: unknown;
  media?: unknown;
  end_date?: string | null;
  report_published?: boolean | null;
};

const SOURCE_LIMIT = 100;
// The generated Supabase client exposes the fluent query builder through a
// generic type that cannot describe the heterogeneous source tables here.
// Keep the cast local to this read-only aggregation boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function dateFor(row: FeedSourceRow) {
  return row.published_at ?? row.occurred_at ?? row.created_at ?? "";
}

function bodyFor(row: FeedSourceRow) {
  return row.summary ?? row.description ?? row.body ?? row.excerpt ?? "";
}

function hrefFor(kind: UnifiedFeedKind, row: FeedSourceRow) {
  if (kind === "article") return `/news/${row.slug ?? row.id}`;
  if (kind === "alert") return `/alerts/${row.id}`;
  if (kind === "report") return `/reports/${row.id}`;
  if (kind === "infrastructure") return `/infrastructure-issues/${row.id}`;
  if (kind === "campaign") return `/campaigns/${row.slug ?? row.id}`;
  if (kind === "video") return `/videos`;
  if (kind === "update") {
    return row.parent_type === "alert" ? `/alerts/${row.parent_id}` : `/reports/${row.parent_id}`;
  }
  return `/feed#post-${row.id}`;
}

function item(kind: UnifiedFeedKind, row: FeedSourceRow): UnifiedFeedItem {
  const createdAt = dateFor(row);
  return {
    key: `${kind}:${row.id}`,
    kind,
    label:
      kind === "article"
        ? "News & Articles"
        : kind === "alert"
          ? "Road Alert"
          : kind === "report"
            ? "Accident Report"
            : kind === "infrastructure"
              ? "Infrastructure Issue"
              : kind === "campaign"
                ? "Campaign"
                : kind === "video"
                  ? "Video"
                  : kind === "update"
                    ? "Administrator Update"
                    : "Community Post",
    sourceId: row.id,
    title:
      row.title ??
      (kind === "community"
        ? "Community post"
        : kind === "video"
          ? "Featured media"
          : "Editorial update"),
    body: bodyFor(row),
    location: [row.county, row.road, row.road_name].filter(Boolean).join(" · ") || null,
    href: hrefFor(kind, row),
    imageUrl: row.image_url ?? row.featured_image_url ?? null,
    mediaUrl: row.video_url ?? null,
    authorId: row.author_id ?? row.user_id ?? null,
    createdAt,
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
    status: row.status ?? null,
    moderationStatus: row.moderation_status ?? null,
    hashtags: Array.isArray(row.hashtags)
      ? row.hashtags.filter((tag): tag is string => typeof tag === "string")
      : [],
    media: Array.isArray(row.media) ? (row.media as UnifiedFeedItem["media"]) : [],
  };
}

async function read<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  source: string,
) {
  const { data, error } = await query;
  if (error) throw new Error(`Unified Feed could not read ${source}: ${error.message}`);
  return data ?? ([] as T);
}

export async function getUnifiedFeed(
  options: { limit?: number; offset?: number; query?: string } = {},
) {
  const limit = Math.min(Math.max(options.limit ?? 30, 1), SOURCE_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);
  const search = options.query?.trim();
  const [articles, alerts, reports, infrastructure, campaigns, videos, posts, updates] =
    await Promise.all([
      read(
        db
          .from("news")
          .select(
            "id,slug,title,summary,image_url,status,published_at,created_at,updated_at,deleted_at",
          )
          .eq("status", "published")
          .is("deleted_at", null)
          .order("published_at", { ascending: false })
          .limit(SOURCE_LIMIT),
        "articles",
      ),
      read(
        db
          .from("alerts")
          .select(
            "id,title,description,county,road,hazard_type,image_url,status,created_at,updated_at,deleted_at",
          )
          .eq("status", "active")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(SOURCE_LIMIT),
        "alerts",
      ),
      read(
        db
          .from("accident_reports")
          .select(
            "id,title,description,county,road,image_url,status,occurred_at,created_at,updated_at,deleted_at",
          )
          .eq("status", "approved")
          .is("deleted_at", null)
          .order("occurred_at", { ascending: false })
          .limit(SOURCE_LIMIT),
        "reports",
      ),
      read(
        db
          .from("infrastructure_issues")
          .select("id,title,summary,road_name,image_url,status,created_at,updated_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(SOURCE_LIMIT),
        "infrastructure issues",
      ),
      read(
        db
          .from("campaigns")
          .select(
            "id,slug,title,description,image_url,start_date,end_date,report_published,created_at,updated_at",
          )
          .order("start_date", { ascending: false })
          .limit(SOURCE_LIMIT),
        "campaigns",
      ),
      read(
        db
          .from("videos")
          .select("id,user_id,title,description,video_url,status,created_at")
          .eq("status", "featured")
          .order("created_at", { ascending: false })
          .limit(SOURCE_LIMIT),
        "videos",
      ),
      read(
        db
          .from("feed_posts")
          .select(
            "id,author_id,body,hashtags,status,moderation_status,created_at,published_at,updated_at",
          )
          .eq("status", "published")
          .eq("moderation_status", "approved")
          .order("published_at", { ascending: false })
          .limit(SOURCE_LIMIT),
        "community posts",
      ),
      read(
        db
          .from("editorial_updates")
          .select(
            "id,parent_type,parent_id,title,body,attachments,status,author_id,created_at,updated_at,published_at",
          )
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(SOURCE_LIMIT),
        "administrator updates",
      ),
    ]);

  const today = new Date().toISOString().slice(0, 10);
  const rows: UnifiedFeedItem[] = [
    ...(articles as FeedSourceRow[]).map((row) => item("article", row)),
    ...(alerts as FeedSourceRow[]).map((row) => item("alert", row)),
    ...(reports as FeedSourceRow[]).map((row) => item("report", row)),
    ...(infrastructure as FeedSourceRow[]).map((row) => item("infrastructure", row)),
    ...(campaigns as FeedSourceRow[])
      .filter((row) => row.end_date >= today || row.report_published === true)
      .map((row) => item("campaign", row)),
    ...(videos as FeedSourceRow[]).map((row) => item("video", row)),
    ...(posts as FeedSourceRow[]).map((row) => item("community", row)),
    ...(updates as FeedSourceRow[]).map((row) => item("update", row)),
  ];
  const normalized = search?.toLowerCase();
  const filtered = normalized
    ? rows.filter((row) =>
        `${row.title} ${row.body} ${row.label}`.toLowerCase().includes(normalized),
      )
    : rows;
  const deduped = new Map(filtered.map((row) => [row.key, row]));
  return [...deduped.values()]
    .sort((a, b) =>
      `${b.publishedAt ?? b.createdAt}|${b.updatedAt ?? ""}|${b.key}`.localeCompare(
        `${a.publishedAt ?? a.createdAt}|${a.updatedAt ?? ""}|${a.key}`,
      ),
    )
    .slice(offset, offset + limit);
}
