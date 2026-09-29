import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, Building2, ExternalLink, Flame, MapPin, Newspaper, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHazardTypes, useReportSeverities } from "@/hooks/useTaxonomy";
import { SeverityBadge } from "@/components/site/severity-badge";
import { displayReportCount } from "@/lib/report-metrics";
import { longDate, longDateWithDay } from "@/lib/format";
import { BannerAd } from "@/components/site/banner-ad";

type Focus = "article" | "alert" | "report";

type ArticlePreview = {
  id: string;
  slug: string;
  title: string;
  category: string;
  image_url: string | null;
  published_at: string;
  summary: string;
};

type AlertPreview = {
  id: string;
  title: string;
  description: string;
  county: string;
  road: string | null;
  hazard_type: string;
  severity: string;
  created_at: string;
};

type ReportPreview = {
  id: string;
  title: string;
  description: string;
  county: string;
  road: string | null;
  severity: string;
  occurred_at: string;
  image_url: string | null;
  vehicles_involved: number | null;
  casualties: number | null;
  fatalities: number | null;
};

export function ArticlePreviewCard({ article }: { article: ArticlePreview }) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: article.slug }}
      className="group overflow-hidden rounded-lg border border-border bg-card card-elevated transition-colors hover:border-accent"
    >
      {article.image_url ? (
        <img src={article.image_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-primary/5 text-primary/50" aria-hidden="true">
          <Newspaper className="size-9" />
        </div>
      )}
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">{article.category}</p>
        <h3 className="mt-1 line-clamp-2 font-bold leading-snug group-hover:underline">{article.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">{longDateWithDay(article.published_at)}</p>
      </div>
    </Link>
  );
}

export function AlertPreviewCard({ alert }: { alert: AlertPreview }) {
  return (
    <Link
      to="/alerts/$alertId"
      params={{ alertId: alert.id }}
      className="group rounded-lg border border-border bg-card p-4 card-elevated transition-colors hover:border-accent"
    >
      <div className="flex flex-wrap items-center gap-2">
        <TriangleAlert className="size-4 text-caution" aria-hidden="true" />
        <SeverityBadge value={alert.severity} />
        <span className="text-xs text-muted-foreground">{alert.hazard_type.replaceAll("_", " ")}</span>
      </div>
      <h3 className="mt-3 line-clamp-2 font-bold leading-snug text-brand-blue group-hover:underline">{alert.title}</h3>
      <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0" aria-hidden="true" /> {alert.county}{alert.road ? ` · ${alert.road}` : ""}
      </p>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{alert.description}</p>
    </Link>
  );
}

export function ReportPreviewCard({ report }: { report: ReportPreview }) {
  return (
    <Link
      to="/reports/$reportId"
      params={{ reportId: report.id }}
      className="group overflow-hidden rounded-lg border border-border bg-card card-elevated transition-colors hover:border-accent"
    >
      {report.image_url ? (
        <img src={report.image_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
      ) : null}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge value={report.severity} />
          <span className="ml-auto text-xs text-muted-foreground">{longDate(report.occurred_at)}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 font-bold leading-snug group-hover:underline">{report.title}</h3>
        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" /> {report.county}{report.road ? ` · ${report.road}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{displayReportCount(report.casualties)} injured</span>
          <span>{displayReportCount(report.fatalities)} deaths</span>
        </div>
      </div>
    </Link>
  );
}

export function TaxonomyDiscovery({ kind }: { kind: "alerts" | "reports" }) {
  const { data: hazards = [] } = useHazardTypes();
  const { data: severities = [] } = useReportSeverities();
  const values = kind === "alerts" ? hazards : severities;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Link
          key={value.value}
          to={kind === "alerts" ? "/alerts" : "/reports"}
          search={kind === "alerts" ? { hazard: value.value } : { severity: value.value }}
          className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-accent hover:bg-accent/10"
        >
          {value.label}
        </Link>
      ))}
    </div>
  );
}

export function SisterPlatformPreviews() {
  return (
    <section className="grid gap-4 sm:grid-cols-2" aria-label="Sister platforms">
      <ExternalPreview
        name="Mjengo Hub"
        description="Construction news, projects and industry conversations from across Kenya and East Africa."
        href="https://mjengohub.co.ke"
      />
      <ExternalPreview
        name="Mjengo Networks"
        description="The wider network connecting people, organisations and opportunities across the built environment."
        href="https://mjengonetworks.co.ke"
      />
    </section>
  );
}

function ExternalPreview({ name, description, href }: { name: string; description: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group rounded-lg border border-primary/20 bg-primary p-5 text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md border border-primary-foreground/25 bg-primary-foreground/10" aria-hidden="true">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-bold">{name}</p>
          <p className="text-xs text-primary-foreground/70">Sister platform</p>
        </div>
        <ExternalLink className="ml-auto size-4 shrink-0" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm text-primary-foreground/80">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline">Visit {name} <ArrowRight className="size-3.5" /></span>
    </a>
  );
}

export function DiscoverySections({ focus, currentId }: { focus: Focus; currentId: string }) {
  const { data: articles = [] } = useQuery<ArticlePreview[]>({
    queryKey: ["discovery-articles", focus, currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category, image_url, published_at, summary")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as ArticlePreview[];
    },
  });
  const { data: alerts = [] } = useQuery<AlertPreview[]>({
    queryKey: ["discovery-alerts", focus, currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, description, county, road, hazard_type, severity, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as AlertPreview[];
    },
  });
  const { data: reports = [] } = useQuery<ReportPreview[]>({
    queryKey: ["discovery-reports", focus, currentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("id, title, description, county, road, severity, occurred_at, image_url, vehicles_involved, casualties, fatalities")
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as ReportPreview[];
    },
  });
  const { data: trending = [] } = useQuery<ArticlePreview[]>({
    queryKey: ["discovery-trending-articles", currentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", { hours_back: 48, result_limit: 8 });
      if (error) return [];
      return (data ?? []) as ArticlePreview[];
    },
  });

  const currentArticleIds = focus === "article" ? new Set([currentId]) : new Set<string>();
  const currentAlertIds = focus === "alert" ? new Set([currentId]) : new Set<string>();
  const currentReportIds = focus === "report" ? new Set([currentId]) : new Set<string>();
  const articlePool = articles.filter((item) => !currentArticleIds.has(item.id));
  const alertPool = alerts.filter((item) => !currentAlertIds.has(item.id));
  const reportPool = reports.filter((item) => !currentReportIds.has(item.id));
  const relatedArticles = focus === "article" ? articlePool.slice(0, 4) : [];
  const relatedAlerts = focus === "alert" ? alertPool.slice(0, 4) : [];
  const relatedReports = focus === "report" ? reportPool.slice(0, 4) : [];
  const relatedArticleIds = new Set(relatedArticles.map((item) => item.id));
  const relatedAlertIds = new Set(relatedAlerts.map((item) => item.id));
  const relatedReportIds = new Set(relatedReports.map((item) => item.id));
  const latestArticles = articlePool.filter((item) => !relatedArticleIds.has(item.id)).slice(0, 4);
  const latestAlerts = alertPool.filter((item) => !relatedAlertIds.has(item.id)).slice(0, 4);
  const latestReports = reportPool.filter((item) => !relatedReportIds.has(item.id)).slice(0, 4);
  const trendingArticles = trending.filter((item) => !currentArticleIds.has(item.id) && !relatedArticleIds.has(item.id)).slice(0, 4);

  return (
    <div className="mt-12 space-y-12">
      {focus === "article" ? <DiscoveryGroup title="Related articles" to="/news" items={relatedArticles} render={(item) => <ArticlePreviewCard article={item} />} /> : null}
      {focus === "alert" ? <DiscoveryGroup title="Related alerts" to="/alerts" items={relatedAlerts} render={(item) => <AlertPreviewCard alert={item} />} /> : null}
      {focus === "report" ? <DiscoveryGroup title="Related accident reports" to="/reports" items={relatedReports} render={(item) => <ReportPreviewCard report={item} />} /> : null}

      {focus === "article" ? <DiscoveryGroup title="Latest articles" to="/news" items={latestArticles} render={(item) => <ArticlePreviewCard article={item} />} /> : null}
      {focus === "article" ? <DiscoveryGroup title="Latest alerts" to="/alerts" items={latestAlerts} render={(item) => <AlertPreviewCard alert={item} />} /> : null}
      {focus === "article" ? <TaxonomyGroup title="Alert categories" kind="alerts" /> : null}
      {focus === "article" ? <DiscoveryGroup title="Latest accident reports" to="/reports" items={latestReports} render={(item) => <ReportPreviewCard report={item} />} /> : null}
      {focus === "article" ? <TaxonomyGroup title="Report types" kind="reports" /> : null}

      {focus === "alert" ? <DiscoveryGroup title="Latest alerts" to="/alerts" items={latestAlerts} render={(item) => <AlertPreviewCard alert={item} />} /> : null}
      {focus === "alert" ? <TaxonomyGroup title="Alert categories" kind="alerts" /> : null}
      {focus === "alert" ? <DiscoveryGroup title="Latest accident reports" to="/reports" items={latestReports} render={(item) => <ReportPreviewCard report={item} />} /> : null}
      {focus === "alert" ? <TaxonomyGroup title="Report types" kind="reports" /> : null}
      {focus === "alert" ? <DiscoveryGroup title="Latest articles" to="/news" items={latestArticles} render={(item) => <ArticlePreviewCard article={item} />} /> : null}

      {focus === "report" ? <DiscoveryGroup title="Latest accident reports" to="/reports" items={latestReports} render={(item) => <ReportPreviewCard report={item} />} /> : null}
      {focus === "report" ? <TaxonomyGroup title="Report types" kind="reports" /> : null}
      {focus === "report" ? <DiscoveryGroup title="Latest alerts" to="/alerts" items={latestAlerts} render={(item) => <AlertPreviewCard alert={item} />} /> : null}
      {focus === "report" ? <TaxonomyGroup title="Alert categories" kind="alerts" /> : null}
      {focus === "report" ? <DiscoveryGroup title="Latest articles" to="/news" items={latestArticles} render={(item) => <ArticlePreviewCard article={item} />} /> : null}
      {trendingArticles.length > 0 ? <DiscoveryGroup title="Trending articles" to="/news" items={trendingArticles} render={(item) => <ArticlePreviewCard article={item} />} icon={<Flame className="size-5 text-destructive" />} /> : null}
      <BannerAd placement={`${focus}-discovery-mid`} />
      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Across the network</p><h2 className="mt-1 text-xl font-bold">Explore sister platforms</h2></div></div>
        <SisterPlatformPreviews />
      </section>
    </div>
  );
}

function DiscoveryGroup<T>({ title, to, search, items, render, icon }: { title: string; to: "/news" | "/alerts" | "/reports"; search?: Record<string, string>; items: T[]; render: (item: T) => ReactNode; icon?: ReactNode }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4"><h2 className="flex items-center gap-2 text-xl font-bold">{icon}{title}</h2><Link to={to} {...(search ? { search } : {})} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline">Read more <ArrowRight className="size-3.5" /></Link></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.slice(0, 4).map((item, index) => <div key={"id" in (item as object) ? String((item as { id: string }).id) : index}>{render(item)}</div>)}</div>
    </section>
  );
}

function TaxonomyGroup({ title, kind }: { title: string; kind: "alerts" | "reports" }) {
  return <section><h2 className="mb-4 text-xl font-bold">{title}</h2><TaxonomyDiscovery kind={kind} /></section>;
}
