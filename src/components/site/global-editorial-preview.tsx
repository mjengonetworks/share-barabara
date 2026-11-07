import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useProfileAvatars, useProfileNames, useProfileUsernames } from "@/lib/profiles";
import { Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getUnifiedFeed } from "@/lib/unified-feed";
import { youtubeId } from "@/lib/video";
import { BannerAd } from "@/components/site/banner-ad";
import type { PreviewDestination, PreviewItem } from "@/lib/global-editorial-preview";
import { UnifiedFeedActivity, type FeedSurfaceTone } from "@/components/site/unified-feed-activity";

type Props = {
  destination: PreviewDestination;
  excludeId?: string;
  excludeKeys?: string[];
  category?: string | null;
  topic?: string | null;
  destinations?: PreviewDestination[];
  fullWidth?: boolean;
};
const meta: Record<PreviewDestination, { label: string; href: string }> = {
  news: { label: "News & Articles", href: "/news" },
  alerts: { label: "Alerts & Advisories", href: "/alerts" },
  reports: { label: "Accident Reports", href: "/reports" },
  campaigns: { label: "Campaigns", href: "/campaigns" },
  infrastructure: { label: "Infrastructure Issues", href: "/infrastructure-issues" },
  statistics: { label: "Statistics", href: "/statistics" },
  media: { label: "Media & Feed", href: "/feed" },
};
const allDestinations: PreviewDestination[] = [
  "news",
  "alerts",
  "reports",
  "campaigns",
  "infrastructure",
  "statistics",
  "media",
];
const mapArticle = (item: any): PreviewItem => ({
  id: item.id,
  title: item.title,
  href: `/news/${item.slug}`,
  imageUrl: item.image_url,
  category: item.category,
  categoryKey: item.category,
  destination: "news",
});
const mapAlert = (item: any): PreviewItem => ({
  id: item.id,
  title: item.title,
  href: `/alerts/${item.id}`,
  category: item.hazard_type,
  categoryKey: item.hazard_type,
  imageUrl: item.image_url,
  destination: "alerts",
});
const mapReport = (item: any): PreviewItem => ({
  id: item.id,
  title: item.title,
  href: `/reports/${item.id}`,
  imageUrl: item.image_url,
  category: item.incident_type,
  categoryKey: item.incident_type,
  destination: "reports",
});
const mapCampaign = (item: any): PreviewItem => ({
  id: item.id,
  title: item.title,
  href: `/campaigns/${item.slug}`,
  imageUrl: item.image_url,
  category: "Campaign",
  destination: "campaigns",
});
const mapInfrastructure = (item: any): PreviewItem => ({
  id: item.id,
  title: item.title,
  href: `/infrastructure-issues/${item.id}`,
  imageUrl: item.image_url,
  category: item.structure_type,
  destination: "infrastructure",
});
const mapStatistics = (item: any): PreviewItem => ({
  id: item.id,
  title: item.title,
  href: "/statistics",
  category: "Statistics",
  destination: "statistics",
});
function MediaImage({ src, compact = false }: { src?: string | null; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return compact ? (
      <span className="flex aspect-video items-center justify-center bg-primary/5">
        <Newspaper className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
    ) : (
      <span className="flex min-h-20 w-full items-center gap-3 bg-gradient-to-br from-primary/10 via-background to-accent/15 px-4 py-3 text-primary/60">
        <Newspaper className="size-7 shrink-0" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Share Barabara update
        </span>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading={compact ? "lazy" : "eager"}
      onError={() => setFailed(true)}
      className={compact ? "aspect-video w-full object-cover" : "aspect-video w-full object-cover"}
    />
  );
}

function ItemLink({
  item,
  identity,
  tone = "white",
}: {
  item: PreviewItem;
  identity?: { name?: string | null; username?: string | null; avatar?: string | null };
  tone?: FeedSurfaceTone;
}) {
  if (item.activity) {
    return (
      <a
        href={item.href}
        className="block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UnifiedFeedActivity
          item={{
            ...item.activity,
            key: item.id,
            sourceId: item.id,
            title: item.title,
            href: item.href,
            imageUrl: item.imageUrl ?? null,
            label: item.category ?? "Media & Feed",
            location: null,
            status: null,
            moderationStatus: null,
            hashtags: [],
            media: [],
            updatedAt: null,
          }}
          identity={identity}
          tone={tone}
        />
      </a>
    );
  }
  return (
    <a
      href={item.href}
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background/70 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MediaImage src={item.imageUrl} />
      <span className="flex min-h-24 flex-1 flex-col p-3">
        {item.category ? (
          <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            {item.category}
          </span>
        ) : null}
        <span className="mt-1 line-clamp-2 font-bold leading-snug text-brand-navy group-hover:underline">
          {item.title}
        </span>
        <span className="mt-auto pt-3 text-xs font-bold text-brand-blue underline underline-offset-4">
          Read more
        </span>
      </span>
    </a>
  );
}

function CompactItemLink({
  item,
  identity,
  tone = "white",
}: {
  item: PreviewItem;
  identity?: { name?: string | null; username?: string | null; avatar?: string | null };
  tone?: FeedSurfaceTone;
}) {
  if (item.activity) {
    return (
      <a
        href={item.href}
        className="block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UnifiedFeedActivity
          compact
          item={{
            ...item.activity,
            key: item.id,
            sourceId: item.id,
            title: item.title,
            href: item.href,
            imageUrl: item.imageUrl ?? null,
            label: item.category ?? "Media & Feed",
            location: null,
            status: null,
            moderationStatus: null,
            hashtags: [],
            media: [],
            updatedAt: null,
          }}
          identity={identity}
          tone={tone}
        />
      </a>
    );
  }
  return (
    <a
      href={item.href}
      className="group flex min-w-0 items-center gap-3 border-t border-border/70 py-3 first:border-t-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="w-24 shrink-0 overflow-hidden rounded bg-primary/5">
        <MediaImage src={item.imageUrl} compact />
      </span>
      <span className="min-w-0">
        {item.category ? (
          <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            {item.category}
          </span>
        ) : null}
        <span className="mt-1 block line-clamp-2 text-sm font-bold leading-snug text-brand-navy group-hover:underline">
          {item.title}
        </span>
      </span>
    </a>
  );
}

export function EditorialTripleCard({
  title,
  items,
  hideHeading = false,
  identities,
  tone = "white",
}: {
  title: string;
  items: PreviewItem[];
  hideHeading?: boolean;
  identities?: Record<
    string,
    { name?: string | null; username?: string | null; avatar?: string | null }
  >;
  tone?: FeedSurfaceTone;
}) {
  const href = items[0] ? meta[items[0].destination].href : undefined;
  return (
    <article
      className={`rounded-xl border p-4 card-elevated ${
        tone === "navy"
          ? "border-[#234276] bg-[#102653]"
          : tone === "blue"
            ? "border-[#c7dcf5] bg-[#EAF3FF]"
            : "border-slate-200 bg-[#FFFFFF]"
      }`}
    >
      {!hideHeading ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="truncate text-sm font-extrabold text-brand-navy">{title}</h3>
          {href ? (
            <a
              href={href}
              className="shrink-0 text-xs font-bold text-brand-blue underline underline-offset-4"
            >
              View all
            </a>
          ) : null}
        </div>
      ) : null}
      {items.length ? (
        <div className="space-y-1">
          <ItemLink item={items[0]} identity={identities?.[items[0].activity?.authorId ?? items[0].id]} tone={tone} />
          {items.slice(1, 3).map((item) => (
            <CompactItemLink
              key={item.id}
              item={item}
              identity={identities?.[item.activity?.authorId ?? item.id]}
              tone={tone}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function GlobalEditorialPreview({
  destination,
  excludeId,
  excludeKeys = [],
  category,
  topic,
  destinations,
  fullWidth = false,
}: Props) {
  const requestedModules = destinations?.length
    ? destinations
    : [destination, ...allDestinations.filter((item) => item !== destination)];
  // The homepage uses the same unified activity source for three independent
  // Pattern B cards. Other route previews retain their single Media & Feed
  // card while still using the same latest-first feed.
  const modules = fullWidth
    ? requestedModules.flatMap((module) =>
        module === "media" ? (["media", "media", "media"] as PreviewDestination[]) : [module],
      )
    : requestedModules;
  const query = useQuery({
    queryKey: ["global-editorial-preview", destination, excludeId, excludeKeys, modules],
    queryFn: async () => {
      const [news, alerts, reports, campaigns, infrastructure, statistics] = await Promise.all([
        supabase
          .from("news")
          .select("id, slug, title, category, image_url, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(18),
        supabase
          .from("alerts")
          .select("id, title, hazard_type, image_url, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(18),
        supabase
          .from("accident_reports")
          .select("id, title, incident_type, occurred_at, image_url")
          .eq("status", "approved")
          .order("occurred_at", { ascending: false })
          .limit(18),
        supabase
          .from("campaigns")
          .select("id, slug, title, image_url, start_date")
          .order("start_date", { ascending: false })
          .limit(18),
        supabase
          .from("infrastructure_issues")
          .select("id, title, structure_type, image_url, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(18),
        (supabase.from("statistics_datasets") as any)
          .select("id,title,last_verified_at")
          .eq("publication_status", "published")
          .order("last_verified_at", { ascending: false })
          .limit(18),
      ]);
      for (const result of [news, alerts, reports, campaigns, infrastructure])
        if (result.error) throw result.error;
      const unifiedFeed = await getUnifiedFeed({ limit: 18 });
      const pools: Record<PreviewDestination, PreviewItem[]> = {
        news: (news.data ?? []).map(mapArticle),
        alerts: (alerts.data ?? []).map(mapAlert),
        reports: (reports.data ?? []).map(mapReport),
        campaigns: (campaigns.data ?? []).map(mapCampaign),
        infrastructure: (infrastructure.data ?? []).map(mapInfrastructure),
        statistics: statistics.error ? [] : (statistics.data ?? []).map(mapStatistics),
        media: unifiedFeed.map((feedItem) => ({
          id: feedItem.key,
          title: feedItem.title,
          href: feedItem.href,
          imageUrl:
            feedItem.imageUrl ??
            (feedItem.mediaUrl && youtubeId(feedItem.mediaUrl)
              ? `https://i.ytimg.com/vi/${youtubeId(feedItem.mediaUrl)}/hqdefault.jpg`
              : null),
          category: feedItem.label,
          destination: "media" as const,
          activity: feedItem,
        })),
      };
      return modules.map((module, moduleIndex) => {
        const mediaCardIndex =
          module === "media"
            ? modules.slice(0, moduleIndex).filter((item) => item === "media").length
            : 0;
        const items = pools[module]
          .filter((item) => item.id !== excludeId)
          .filter((item) => !excludeKeys.includes(`${item.destination}:${item.id}`))
          .filter(
            (item) =>
              module !== destination ||
              !category ||
              item.category?.toLowerCase() === category.toLowerCase(),
          )
          .filter(
            (item) =>
              module !== destination ||
              !topic ||
              item.category?.toLowerCase() === topic.toLowerCase(),
          )
          .slice(
            module === "media" ? mediaCardIndex * 3 : 0,
            module === "media" ? mediaCardIndex * 3 + 3 : 3,
          );
        return { module, items };
      });
    },
  });
  const mediaItems = (query.data ?? [])
    .flatMap((card) => card.items)
    .filter((item) => item.activity)
    .map((item) => item.activity!);
  const authorIds = mediaItems
    .map((item) => item.authorId)
    .filter((id): id is string => Boolean(id));
  const { data: authorNames = {} } = useProfileNames(authorIds);
  const { data: authorUsernames = {} } = useProfileUsernames(authorIds);
  const { data: authorAvatars = {} } = useProfileAvatars(authorIds);
  const identities = Object.fromEntries(
    authorIds.map((id) => [
      id,
      { name: authorNames[id], username: authorUsernames[id], avatar: authorAvatars[id] },
    ]),
  );
  const cards = (query.data ?? []).filter((card) => card.items.length > 0);
  if (cards.length === 0) return null;
  return (
    <section
      className={`${fullWidth ? "w-full" : "mx-auto max-w-6xl px-4"} space-y-4 pb-8`}
      aria-label="Cross-content editorial previews"
    >
      {Array.from({ length: Math.ceil(cards.length / 3) }, (_, row) => {
        const rowCards = cards.slice(row * 3, row * 3 + 3);
        const isMediaRow = rowCards.length > 0 && rowCards.every((card) => card.module === "media");
        return (
          <div key={`discovery-row-${row}`} className="space-y-4">
            {isMediaRow ? (
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-lg font-extrabold text-brand-navy">Media &amp; Feed</h2>
                <a
                  href="/feed"
                  className="text-sm font-bold text-brand-blue underline underline-offset-4"
                >
                  View all
                </a>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              {rowCards.map(({ module, items }, cardIndex) => (
                  <EditorialTripleCard
                  key={`${module}-${row * 3 + cardIndex}`}
                  title={meta[module].label}
                  items={items}
                  hideHeading={isMediaRow}
                  identities={identities}
                  tone={isMediaRow ? (["white", "blue", "navy"] as const)[cardIndex % 3] : "white"}
                />
              ))}
            </div>
            <BannerAd placement={`global-editorial-discovery-row-${row + 1}`} />
          </div>
        );
      })}
    </section>
  );
}
