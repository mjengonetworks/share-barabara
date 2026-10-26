import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  buildPreviewCards,
  type PreviewDestination,
  type PreviewItem,
} from "@/lib/global-editorial-preview";

type Props = {
  destination: PreviewDestination;
  excludeId?: string;
  category?: string | null;
  topic?: string | null;
  destinations?: PreviewDestination[];
};

const destinationMeta: Record<PreviewDestination, { label: string; href: string }> = {
  news: { label: "News & Articles", href: "/news" },
  alerts: { label: "Alerts & Advisories", href: "/alerts" },
  reports: { label: "Accident Reports", href: "/reports" },
  campaigns: { label: "Campaigns", href: "/campaigns" },
  infrastructure: { label: "Infrastructure Issues", href: "/infrastructure-issues" },
};

function mapArticle(item: any, rank?: number): PreviewItem {
  return {
    id: item.id,
    title: item.title,
    href: "/news/" + item.slug,
    imageUrl: item.image_url,
    category: item.category,
    categoryKey: item.category,
    destination: "news",
    recordedViewRank: rank,
  };
}
function mapAlert(item: any, rank?: number): PreviewItem {
  return {
    id: item.id,
    title: item.title,
    href: "/alerts/" + item.id,
    category: item.hazard_type,
    categoryKey: item.hazard_type,
    destination: "alerts",
    recordedViewRank: rank,
  };
}
function mapReport(item: any, rank?: number): PreviewItem {
  return {
    id: item.id,
    title: item.title,
    href: "/reports/" + item.id,
    imageUrl: item.image_url,
    category: item.incident_type,
    categoryKey: item.incident_type,
    destination: "reports",
    recordedViewRank: rank,
  };
}
function mapCampaign(item: any): PreviewItem {
  return {
    id: item.id,
    title: item.title,
    href: "/campaigns/" + item.slug,
    imageUrl: item.image_url,
    category: "Campaign",
    destination: "campaigns",
  };
}

const allDestinations: PreviewDestination[] = ["news", "alerts", "reports", "campaigns", "infrastructure"];

function categoryHref(destination: PreviewDestination, category?: string | null) {
  if (!category) return destinationMeta[destination].href;
  const query = destination === "news"
    ? `?category=${encodeURIComponent(category)}`
    : destination === "alerts"
      ? `?hazard=${encodeURIComponent(category)}`
      : destination === "reports"
        ? `?incident=${encodeURIComponent(category)}`
        : "";
  return destinationMeta[destination].href + query;
}
function mapInfrastructure(item: any): PreviewItem {
  return {
    id: item.id,
    title: item.title,
    href: "/infrastructure-issues/" + item.id,
    imageUrl: item.image_url,
    category: item.structure_type,
    destination: "infrastructure",
  };
}

function ItemLink({ item, featured }: { item: PreviewItem; featured?: boolean }) {
  const featuredClass = featured ? "min-h-44 flex-col" : "items-center";
  const imageClass = featured
    ? "aspect-video w-full rounded object-cover"
    : "size-16 shrink-0 rounded object-cover";
  const fallbackClass = featured
    ? "flex aspect-video w-full items-center justify-center rounded bg-primary/5 text-primary/50"
    : "flex size-16 shrink-0 items-center justify-center rounded bg-primary/5 text-primary/50";
  return (
    <a
      href={item.href}
      className={
        "group flex min-w-0 gap-3 rounded-lg border border-border bg-background/70 p-3 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        featuredClass
      }
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" loading="lazy" className={imageClass} />
      ) : (
        <span className={fallbackClass} aria-hidden="true">
          <Newspaper className={featured ? "size-8" : "size-5"} />
        </span>
      )}
      <span className="min-w-0">
        {item.category ? (
          <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            {item.category}
          </span>
        ) : null}
        <span
          className={
            "block line-clamp-2 font-bold leading-snug text-brand-navy group-hover:underline " +
            (featured ? "mt-1 text-base" : "text-sm")
          }
        >
          {item.title}
        </span>
      </span>
    </a>
  );
}

function PreviewCard({
  title,
  items,
  viewHref,
}: {
  title: string;
  items: PreviewItem[];
  viewHref: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-3 card-elevated">
      <div className="mb-3 flex items-start gap-2">
        <BarChart3 className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-brand-navy">{title}</h3>
        </div>
      </div>
      {items.length ? (
        <div className="space-y-2">
          <ItemLink item={items[0]} featured />
          {items.slice(1, 3).map((item) => (
            <ItemLink key={item.id} item={item} />
          ))}
          <a
            href={viewHref}
            className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-brand-blue underline underline-offset-2"
          >
            View more <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          No verified items are available for this preview yet.
        </p>
      )}
    </article>
  );
}

export function GlobalEditorialPreview({ destination, excludeId, category, topic }: Props) {
  const modules = allDestinations;
  const query = useQuery({
    queryKey: ["global-editorial-preview", destination, excludeId, category, topic, modules],
    queryFn: async () => {
      const [
        news,
        alerts,
        reports,
        campaigns,
        infrastructure,
        trendingNews,
        trendingAlerts,
        trendingReports,
      ] = await Promise.all([
        supabase
          .from("news")
          .select("id, slug, title, summary, category, image_url, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(18),
        supabase
          .from("alerts")
          .select("id, title, description, hazard_type, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(18),
        supabase
          .from("accident_reports")
          .select("id, title, description, incident_type, occurred_at, image_url")
          .eq("status", "approved")
          .order("occurred_at", { ascending: false })
          .limit(18),
        supabase
          .from("campaigns")
          .select("id, slug, title, description, image_url, start_date")
          .order("start_date", { ascending: false })
          .limit(18),
        supabase
          .from("infrastructure_issues")
          .select("id, title, summary, content, structure_type, image_url, created_at")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(18),
        supabase.rpc("trending_news", { hours_back: 168, result_limit: 30 }),
        supabase.rpc("trending_alerts", { hours_back: 168, result_limit: 30 }),
        supabase.rpc("trending_reports", { hours_back: 168, result_limit: 30 }),
      ]);
      if (news.error) throw news.error;
      if (alerts.error) throw alerts.error;
      if (reports.error) throw reports.error;
      if (campaigns.error) throw campaigns.error;
      if (infrastructure.error) throw infrastructure.error;
      const mapRanked = (items: any[], map: (item: any, rank?: number) => PreviewItem) =>
        items.map((item, index) => map(item, index));
      const pools: Record<PreviewDestination, { latest: PreviewItem[]; ranked: PreviewItem[] }> = {
        news: {
          latest: (news.data ?? []).map(mapArticle),
          ranked: mapRanked(trendingNews.data ?? [], mapArticle),
        },
        alerts: {
          latest: (alerts.data ?? []).map(mapAlert),
          ranked: mapRanked(trendingAlerts.data ?? [], mapAlert),
        },
        reports: {
          latest: (reports.data ?? []).map(mapReport),
          ranked: mapRanked(trendingReports.data ?? [], mapReport),
        },
        campaigns: { latest: (campaigns.data ?? []).map(mapCampaign), ranked: [] },
        infrastructure: { latest: (infrastructure.data ?? []).map(mapInfrastructure), ranked: [] },
      };
      const applyContext = (module: PreviewDestination, items: PreviewItem[]) =>
        items
          .filter((item) => item.id !== excludeId)
        .filter((item) => module !== destination || !category || item.category?.toLowerCase() === category.toLowerCase())
        .filter((item) => module !== destination || !topic || item.category?.toLowerCase() === topic.toLowerCase());
      return Object.fromEntries(modules.map((module) => [module, buildPreviewCards(
        applyContext(module, pools[module].latest),
        applyContext(module, pools[module].ranked),
        { latest: "Latest" },
      )]));
    },
  });
  const cardsByDestination = (query.data ?? {}) as Record<PreviewDestination, ReturnType<typeof buildPreviewCards>>;
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8" aria-label="Global editorial previews">
      {modules.map((module) => {
        const meta = destinationMeta[module];
        const cards = cardsByDestination[module] ?? [];
        return (
          <section key={module} aria-label={`Global ${meta.label} previews`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent-foreground">Keep exploring</p>
                <h2 className="mt-1 text-xl font-extrabold text-brand-navy">More from {meta.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Verified editorial previews from across Share Barabara.</p>
              </div>
              <a href={meta.href} className="inline-flex items-center gap-1 text-sm font-bold text-brand-blue underline underline-offset-2">
                View all {meta.label} <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {cards.map((card) => (
                <div key={card.key} className={card.ranked ? "hidden md:block" : ""}>
                  <PreviewCard
                    title={card.title}
                    items={card.items}
                    viewHref={card.ranked ? categoryHref(module, card.items[0]?.categoryKey) : meta.href}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
