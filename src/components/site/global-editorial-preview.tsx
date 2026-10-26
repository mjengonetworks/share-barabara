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
    summary: item.summary,
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
    summary: item.description,
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
    summary: item.description,
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
    summary: item.description,
    category: "Campaign",
    destination: "campaigns",
  };
}
function mapInfrastructure(item: any): PreviewItem {
  return {
    id: item.id,
    title: item.title,
    href: "/infrastructure-issues/" + item.id,
    imageUrl: item.image_url,
    summary: item.summary ?? item.content,
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
        {featured && item.summary ? (
          <span className="mt-2 block line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.summary}
          </span>
        ) : null}
      </span>
    </a>
  );
}

function PreviewCard({
  title,
  description,
  items,
  viewHref,
}: {
  title: string;
  description: string;
  items: PreviewItem[];
  viewHref: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-3 card-elevated">
      <div className="mb-3 flex items-start gap-2">
        <BarChart3 className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-extrabold text-brand-navy">{title}</h3>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{description}</p>
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
  const meta = destinationMeta[destination];
  const query = useQuery({
    queryKey: ["global-editorial-preview", destination, excludeId, category, topic],
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
      const applyContext = (items: PreviewItem[]) =>
        items
          .filter((item) => item.id !== excludeId)
          .filter((item) => !category || item.category?.toLowerCase() === category.toLowerCase())
          .filter((item) => !topic || item.category?.toLowerCase() === topic.toLowerCase());
      return buildPreviewCards(
        applyContext(pools[destination].latest),
        applyContext(pools[destination].ranked),
        { latest: "Latest" },
      );
    },
  });
  const cards = query.data ?? [];
  return (
    <section
      className="mx-auto max-w-6xl px-4 py-8"
      aria-label={"Global " + meta.label + " previews"}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent-foreground">
            Keep exploring
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-brand-navy">More from {meta.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verified editorial previews from across Share Barabara.
          </p>
        </div>
        <a
          href={meta.href}
          className="inline-flex items-center gap-1 text-sm font-bold text-brand-blue underline underline-offset-2"
        >
          View all <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {cards[0] ? (
          <PreviewCard
            title={cards[0].title}
            description={cards[0].description}
            items={cards[0].items}
            viewHref={meta.href}
          />
        ) : null}
        <div className="hidden md:block">
          {cards[1] ? (
            <PreviewCard
              title={cards[1].title}
              description={cards[1].description}
              items={cards[1].items}
              viewHref={meta.href}
            />
          ) : (
            <PreviewCard
              title="Highest-viewed eligible category"
              description="Waiting for recorded public views."
              items={[]}
              viewHref={meta.href}
            />
          )}
        </div>
        <div className="hidden md:block">
          {cards[2] ? (
            <PreviewCard
              title={cards[2].title}
              description={cards[2].description}
              items={cards[2].items}
              viewHref={meta.href}
            />
          ) : (
            <PreviewCard
              title="Second-highest-viewed eligible category"
              description="Waiting for recorded public views."
              items={[]}
              viewHref={meta.href}
            />
          )}
        </div>
      </div>
    </section>
  );
}
