import { useQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BannerAd } from "@/components/site/banner-ad";
import type { PreviewDestination, PreviewItem } from "@/lib/global-editorial-preview";

type Props = {
  destination: PreviewDestination;
  excludeId?: string;
  excludeKeys?: string[];
  category?: string | null;
  topic?: string | null;
  destinations?: PreviewDestination[];
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
const mapMedia = (item: any): PreviewItem => ({
  id: item.id,
  title: item.title,
  href: "/videos",
  category: "Media",
  destination: "media",
});

function ItemLink({ item }: { item: PreviewItem }) {
  return (
    <a
      href={item.href}
      className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background/70 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
      ) : (
        <span
          className="flex aspect-video w-full items-center justify-center bg-primary/5 text-primary/50"
          aria-hidden="true"
        >
          <Newspaper className="size-8" />
        </span>
      )}
      <span className="flex min-h-28 flex-1 flex-col p-3">
        {item.category ? (
          <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            {item.category}
          </span>
        ) : null}
        <span className="mt-1 line-clamp-3 font-bold leading-snug text-brand-navy group-hover:underline">
          {item.title}
        </span>
        <span className="mt-auto pt-3 text-xs font-bold text-brand-blue underline underline-offset-4">
          Read more
        </span>
      </span>
    </a>
  );
}

export function EditorialTripleCard({ title, items }: { title: string; items: PreviewItem[] }) {
  const href = items[0] ? meta[items[0].destination].href : undefined;
  return (
    <article className="rounded-xl border border-border bg-card p-4 card-elevated">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="truncate text-sm font-extrabold text-brand-navy">{title}</h3>
        {href ? (
          <a href={href} className="shrink-0 text-xs font-bold text-brand-blue underline underline-offset-4">
            View all
          </a>
        ) : null}
      </div>
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {items.slice(0, 3).map((item) => <ItemLink key={item.id} item={item} />)}
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
}: Props) {
  const modules = destinations?.length
    ? destinations
    : [destination, ...allDestinations.filter((item) => item !== destination)];
  const query = useQuery({
    queryKey: ["global-editorial-preview", destination, excludeId, excludeKeys, modules],
    queryFn: async () => {
      const [news, alerts, reports, campaigns, infrastructure, statistics, media] =
        await Promise.all([
          supabase
            .from("news")
            .select("id, slug, title, category, image_url, published_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(18),
          supabase
            .from("alerts")
            .select("id, title, hazard_type, created_at")
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
          (supabase.from("videos") as any)
            .select("id,title,created_at")
            .eq("status", "featured")
            .order("created_at", { ascending: false })
            .limit(18),
        ]);
      for (const result of [news, alerts, reports, campaigns, infrastructure])
        if (result.error) throw result.error;
      const pools: Record<PreviewDestination, PreviewItem[]> = {
        news: (news.data ?? []).map(mapArticle),
        alerts: (alerts.data ?? []).map(mapAlert),
        reports: (reports.data ?? []).map(mapReport),
        campaigns: (campaigns.data ?? []).map(mapCampaign),
        infrastructure: (infrastructure.data ?? []).map(mapInfrastructure),
        statistics: statistics.error ? [] : (statistics.data ?? []).map(mapStatistics),
        media: media.error ? [] : (media.data ?? []).map(mapMedia),
      };
      const used = new Set<string>();
      return modules.map((module) => {
        const items = pools[module]
          .filter((item) => item.id !== excludeId)
          .filter((item) => !excludeKeys.includes(`${item.destination}:${item.id}`))
          .filter((item) => !used.has(`${item.destination}:${item.id}`))
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
          .slice(0, 3);
        items.forEach((item) => used.add(`${item.destination}:${item.id}`));
        return { module, items };
      });
    },
  });
  const cards = (query.data ?? []).filter((card) => card.items.length > 0);
  if (cards.length === 0) return null;
  return (
    <section
      className="mx-auto max-w-6xl space-y-4 px-4 pb-8"
      aria-label="Cross-content editorial previews"
    >
      {Array.from({ length: Math.ceil(cards.length / 3) }, (_, row) => {
        const rowCards = cards.slice(row * 3, row * 3 + 3);
        return (
          <div key={`discovery-row-${row}`} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {rowCards.map(({ module, items }) => (
                <EditorialTripleCard key={module} title={meta[module].label} items={items} />
              ))}
            </div>
            <BannerAd placement={`global-editorial-discovery-row-${row + 1}`} />
          </div>
        );
      })}
    </section>
  );
}
