import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BannerAd } from "@/components/site/banner-ad";
import type { PreviewDestination, PreviewItem } from "@/lib/global-editorial-preview";

type Props = {
  destination: PreviewDestination;
  excludeId?: string;
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
};
const allDestinations: PreviewDestination[] = [
  "news",
  "alerts",
  "reports",
  "campaigns",
  "infrastructure",
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

function ItemLink({ item, featured }: { item: PreviewItem; featured?: boolean }) {
  return (
    <a
      href={item.href}
      className={`group flex min-w-0 gap-3 rounded-lg border border-border bg-background/70 p-3 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${featured ? "min-h-44 flex-col" : "items-center"}`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className={
            featured
              ? "aspect-video w-full rounded object-cover"
              : "size-16 shrink-0 rounded object-cover"
          }
        />
      ) : (
        <span
          className={
            featured
              ? "flex aspect-video w-full items-center justify-center rounded bg-primary/5 text-primary/50"
              : "flex size-16 shrink-0 items-center justify-center rounded bg-primary/5 text-primary/50"
          }
          aria-hidden="true"
        >
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
          className={`block line-clamp-2 font-bold leading-snug text-brand-navy group-hover:underline ${featured ? "mt-1 text-base" : "text-sm"}`}
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
      <h3 className="mb-3 truncate text-sm font-extrabold text-brand-navy">{title}</h3>
      {items[0] ? (
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
      ) : null}
    </article>
  );
}

export function GlobalEditorialPreview({
  destination,
  excludeId,
  category,
  topic,
  destinations,
}: Props) {
  const modules = (
    destinations?.length
      ? destinations
      : [destination, ...allDestinations.filter((item) => item !== destination)]
  ).slice(0, 3);
  const query = useQuery({
    queryKey: ["global-editorial-preview", destination, excludeId, modules],
    queryFn: async () => {
      const [news, alerts, reports, campaigns, infrastructure] = await Promise.all([
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
      ]);
      for (const result of [news, alerts, reports, campaigns, infrastructure])
        if (result.error) throw result.error;
      const pools: Record<PreviewDestination, PreviewItem[]> = {
        news: (news.data ?? []).map(mapArticle),
        alerts: (alerts.data ?? []).map(mapAlert),
        reports: (reports.data ?? []).map(mapReport),
        campaigns: (campaigns.data ?? []).map(mapCampaign),
        infrastructure: (infrastructure.data ?? []).map(mapInfrastructure),
      };
      const used = new Set<string>();
      return modules.map((module) => {
        const items = pools[module]
          .filter((item) => item.id !== excludeId && !used.has(`${item.destination}:${item.id}`))
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
  if (cards.every((card) => card.items.length === 0)) return null;
  return (
    <section
      className="mx-auto max-w-6xl space-y-5 px-4 py-8"
      aria-label="More from Share Barabara"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent-foreground">
            Keep exploring
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-brand-navy">More from Share Barabara</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(({ module, items }) => (
          <PreviewCard
            key={module}
            title={meta[module].label}
            items={items}
            viewHref={meta[module].href}
          />
        ))}
      </div>
      <BannerAd placement="global-editorial-discovery-row-1" />
    </section>
  );
}
