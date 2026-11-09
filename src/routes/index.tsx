import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, Building2, CarFront, Megaphone } from "lucide-react";
import heroRoad from "@/assets/hero-road.jpg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { num } from "@/lib/format";
import { EMERGENCY_CONTACTS } from "@/lib/constants";
import { BannerAd } from "@/components/site/banner-ad";
import { SearchBar } from "@/components/site/search-bar";
import { QuoteOfTheDay } from "@/components/site/quote-of-the-day";
import { FeaturedPageCard, FeaturedProfileCard } from "@/components/site/featured-cards";
import { useFeaturedPagesList } from "@/hooks/useFeatured";
import { PublicNewsletterCard } from "@/components/site/public-ui";
import { NewsletterForm } from "@/components/site/newsletter-form";
import {
  AlertPreviewCard,
  ArticlePreviewCard,
  ReportPreviewCard,
  TaxonomyDiscovery,
} from "@/components/site/discovery-sections";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { HomepageMediaFeedPreview } from "@/components/site/global-editorial-preview";
import { HomepageContentPreviews } from "@/components/site/homepage-content-previews";
import { TaxonomyStrip, type TaxonomyStripItem } from "@/components/site/taxonomy-strip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Share Barabara - Share the Road: Live Hazard Alerts, Accident Reports, and Road Safety Campaigns",
      },
      {
        name: "description",
        content:
          "Live road hazard alerts, crash statistics, articles and safety guidance for Kenya's roads. Report hazards, file accident reports and join the conversation.",
      },
      {
        property: "og:title",
        content:
          "Share Barabara - Share the Road: Live Hazard Alerts, Accident Reports, and Road Safety Campaigns",
      },
      {
        property: "og:description",
        content: "Live hazard alerts, crash data and safety guidance for every Kenyan road user.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: alerts = [] } = useQuery({
    queryKey: ["home-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, description, county, road, hazard_type, severity")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: news = [] } = useQuery({
    queryKey: ["home-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category, image_url, published_at, summary, county, road")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: homepageTaxonomy = { news: [], alerts: [], reports: [], infrastructure: [] } } = useQuery({
    queryKey: ["home-published-taxonomy"],
    queryFn: async () => {
      const [articles, articleCategories, alerts, hazardTypes, reports, reportSeverities, issues] =
        await Promise.all([
          supabase.from("news").select("category, categories").eq("status", "published").limit(1000),
          supabase.from("news_categories").select("name, label, active, sort_order").order("sort_order"),
          supabase.from("alerts").select("hazard_type").eq("status", "active").limit(1000),
          supabase.from("hazard_types").select("value, label, active, sort_order").order("sort_order"),
          supabase.from("accident_reports").select("severity, incident_type").eq("status", "approved").limit(1000),
          supabase.from("report_severities").select("value, label, active, sort_order").order("sort_order"),
          supabase.from("infrastructure_issues").select("structure_type").eq("status", "approved").limit(1000),
        ]);
      for (const result of [articles, articleCategories, alerts, hazardTypes, reports, reportSeverities, issues]) {
        if (result.error) throw result.error;
      }
      const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase();
      const formatLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      const articleValues = new Set(
        (articles.data ?? []).flatMap((article) => [article.category, ...(article.categories ?? [])].map(normalized)).filter(Boolean),
      );
      const newsItems: TaxonomyStripItem[] = (articleCategories.data ?? [])
        .filter((category) => category.active !== false)
        .filter((category) => articleValues.has(normalized(category.name)) || articleValues.has(normalized(category.label)))
        .map((category) => ({
          key: category.name,
          label: category.label ?? category.name,
          to: "/news",
          search: { category: category.name },
        }));
      const eligibleAlerts = new Set((alerts.data ?? []).map((row) => normalized(row.hazard_type)).filter(Boolean));
      const alertItems: TaxonomyStripItem[] = (hazardTypes.data ?? [])
        .filter((type) => type.active !== false && eligibleAlerts.has(normalized(type.value)))
        .map((type) => ({ key: type.value, label: type.label, to: "/alerts", search: { hazard: type.value } }));
      const eligibleReports = reports.data ?? [];
      const reportItems: TaxonomyStripItem[] = [];
      const eligibleSeverities = new Set(eligibleReports.map((row) => normalized(row.severity)).filter(Boolean));
      for (const severity of (reportSeverities.data ?? []).filter((row) => row.active !== false && eligibleSeverities.has(normalized(row.value)))) {
        reportItems.push({ key: `severity:${severity.value}`, label: severity.label, to: "/reports", search: { severity: severity.value } });
      }
      for (const incident of Array.from(new Set(eligibleReports.map((row) => String(row.incident_type ?? "").trim()).filter(Boolean)))) {
        reportItems.push({ key: `incident:${incident}`, label: formatLabel(incident), to: "/reports", search: { incident } });
      }
      const infrastructureItems: TaxonomyStripItem[] = Array.from(
        new Set((issues.data ?? []).map((row) => String(row.structure_type ?? "").trim()).filter(Boolean)),
      ).map((structure) => ({
        key: structure,
        label: formatLabel(structure),
        to: "/infrastructure-issues",
        search: { structure },
      }));
      return { news: newsItems, alerts: alertItems, reports: reportItems, infrastructure: infrastructureItems };
    },
    staleTime: 60_000,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["home-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select(
          "id, title, description, county, road, severity, occurred_at, image_url, vehicles_involved, casualties, fatalities",
        )
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: recordedAccidents, isError: recordedAccidentsError } = useQuery({
    queryKey: ["home-recorded-accidents"],
    queryFn: async () => {
      const count = await (supabase as any).rpc("published_accident_report_count");
      if (!count.error) return Number(count.data ?? 0);
      const current = await supabase
        .from("accident_reports")
        .select("id, duplicate_of_report_id, deleted_at")
        .eq("status", "approved")
        .is("deleted_at", null);
      if (!current.error)
        return current.data.filter((report) => !report.duplicate_of_report_id).length;
      if (
        !/duplicate_of_report_id|deleted_at|column .* does not exist|schema cache/i.test(
          current.error.message ?? "",
        )
      )
        throw current.error;
      const legacy = await supabase.from("accident_reports").select("id").eq("status", "approved");
      if (legacy.error) throw legacy.error;
      return legacy.data.length;
    },
    staleTime: 60_000,
  });

  const { data: pages = [] } = useFeaturedPagesList();

  const { data: officialMetrics = [] } = useQuery({
    queryKey: ["home-official-statistics"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("statistics_datasets") as any)
        .select(
          "id,title,metric_type,unit,source_organization,source_url,reporting_period_start,reporting_period_end,last_verified_at,statistics_observations(value,record_status,verification_status,period_start,period_end)",
        )
        .eq("publication_status", "published")
        .eq("geography_level", "national")
        .order("reporting_period_end", { ascending: false })
        .limit(24);
      if (error) {
        if (
          /statistics_datasets|statistics_observations|relation|schema cache|does not exist/i.test(
            error.message ?? "",
          )
        )
          return [];
        throw error;
      }
      return (data ?? [])
        .map((dataset: any) => {
          const observation = (dataset.statistics_observations ?? [])
            .filter(
              (row: any) =>
                row.record_status === "published" &&
                ["provisional", "final"].includes(row.verification_status),
            )
            .sort((a: any, b: any) => String(b.period_end).localeCompare(String(a.period_end)))[0];
          return observation ? { ...dataset, observation } : null;
        })
        .filter(Boolean) as Array<Record<string, any>>;
    },
    staleTime: 60_000,
  });

  const officialMetric = (metric: string) =>
    officialMetrics.find(
      (item) =>
        item.metric_type === metric || (metric === "deaths" && item.metric_type === "fatalities"),
    );

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroRoad}
          alt="Night-time long exposure of a Kenyan highway with light trails"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/40" />
        <div className="relative public-content-container py-10 sm:py-6">
          <div className="flex flex-wrap gap-2">
            <a
              href="https://mjengohub.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-primary-foreground/25 bg-primary/75 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary"
            >
              Mjengo Hub
            </a>
            <a
              href="https://mjengonetworks.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-primary-foreground/25 bg-primary/75 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary"
            >
              Mjengo Networks
            </a>
          </div>
          <div className="mt-4 hazard-stripe h-1.5 w-24 rounded" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Share Barabara Kenya
          </p>
          <h1 className="mt-2 max-w-5xl font-display text-[2.31rem] font-extrabold leading-tight sm:text-[2.8875rem]">
            Every journey home should end at home.
          </h1>
          <p className="mt-4 max-w-xl text-[12.6px] text-muted-foreground lg:max-w-3xl">
            Share Barabara brings together live hazard alerts, crash data and road safety news from
            Kenya and beyond. Reported directly by road users
          </p>
          <SearchBar className="mt-6 max-w-md" />
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/alerts">
                See live alerts <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/statistics">View the statistics</Link>
            </Button>
          </div>
          <div className="mt-7 grid max-w-4xl gap-3 sm:grid-cols-3">
            <Link
              to="/statistics"
              className="rounded-lg border border-accent/70 bg-card/95 p-3 backdrop-blur transition-colors hover:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Stat
                value={
                  recordedAccidentsError
                    ? "—"
                    : recordedAccidents === undefined
                      ? "…"
                      : num(recordedAccidents)
                }
                label="recorded road accidents"
                danger
              />
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Approved, deduplicated road reports
              </span>
            </Link>
            <OfficialMetricCard
              metric={officialMetric("deaths")}
              fallback="Official fatalities pending verification"
            />
            <OfficialMetricCard
              metric={officialMetric("serious_injuries")}
              fallback="Official serious injuries pending verification"
            />
          </div>
        </div>
      </section>

      <section className="public-content-container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[1.44375rem] font-bold">Latest hazard alerts</h2>
          <div className="flex gap-3">
            <Button asChild size="sm">
              <Link to="/alerts">Submit alert</Link>
            </Button>
            <Link
              to="/alerts"
              className="self-center text-sm font-semibold text-brand-blue underline"
            >
              Read more
            </Link>
          </div>
        </div>
        {alerts.length === 0 ? (
          <p className="mt-6 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
            No alerts posted yet. Be the first to report a hazard on your route.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {alerts.map((a) => (
              <AlertPreviewCard key={a.id} alert={a} />
            ))}
          </div>
        )}
        <TaxonomyDiscovery kind="alerts" items={homepageTaxonomy.alerts} />
      </section>

      <section className="public-content-container py-10">
        <FeaturedProfileCard slot="home_profile" />
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="public-content-container py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[1.44375rem] font-bold">News &amp; Articles</h2>
            <div className="flex gap-3">
              <Button asChild size="sm">
                <Link to="/news">Write article</Link>
              </Button>
              <Link
                to="/news"
                className="self-center text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          </div>
          {news.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {news.map((n) => (
                <ArticlePreviewCard key={n.id} article={n} />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No published articles yet.
            </p>
          )}
          <TaxonomyStrip heading="Browse articles by category" items={homepageTaxonomy.news} />
        </div>
      </section>

      <section className="public-content-container py-6">
        <BannerAd placement="homepage-between-news-reports" />
      </section>

      <section className="public-content-container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="flex items-center gap-2 text-[1.44375rem] font-bold">
            <CarFront className="size-7 text-accent" /> Accident reports
          </h2>
          <div className="flex gap-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/reports">Submit report for review</Link>
            </Button>
            <Link
              to="/reports"
              className="self-center text-sm font-semibold text-brand-blue underline"
            >
              Read more
            </Link>
          </div>
        </div>
        {reports.length === 0 ? (
          <p className="mt-6 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
            No published reports yet.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {reports.map((r) => (
              <ReportPreviewCard key={r.id} report={r} />
            ))}
          </div>
        )}
        <TaxonomyDiscovery kind="reports" items={homepageTaxonomy.reports} />
      </section>

      {pages.length > 0 ? (
        <section className="public-content-container py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="flex items-center gap-2 text-[1.44375rem] font-bold">
              <Building2 className="size-7 text-accent" /> Pages
            </h2>
            <Link to="/pages" className="text-sm font-semibold text-brand-blue underline">
              View all pages
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p) => (
              <Link
                key={p.id}
                to="/pages/$slug"
                params={{ slug: p.slug }}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors card-elevated hover:border-accent"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded bg-accent/20 text-accent-foreground">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate font-semibold text-brand-blue group-hover:underline">
                    {p.name}
                    {p.verified ? (
                      <BadgeCheck
                        className="size-4 shrink-0 text-accent"
                        aria-label="Verified page"
                      />
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <HomepageContentPreviews infrastructureTaxonomy={homepageTaxonomy.infrastructure} />
      <HomepageMediaFeedPreview />

      <section className="public-content-container py-6">
        <BannerAd placement="homepage-support-partner" />
      </section>

      <section className="public-content-container py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <QuoteOfTheDay />
          <div className="flex flex-col justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
            <Megaphone className="mx-auto size-7 text-accent" />
            <p className="mt-2 font-bold">Reach Kenyan road users</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Partner with Share Barabara: banner ads, sponsored article features and social media
              collaborations, not limited to road-safety brands.
            </p>
            <Button asChild variant="outline" className="mt-4 self-center">
              <Link to="/partner-with-us">Advertise on the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="public-content-container">
          <PublicNewsletterCard
            title="Get the Share Barabara newsletter"
            description="Hazard trends, new campaigns and top stories, straight to your inbox."
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="w-full sm:w-auto sm:min-w-[22rem] sm:max-w-[34rem]">
              <NewsletterForm variant="gold" />
            </div>
          </PublicNewsletterCard>
        </div>
      </section>

      <section className="public-content-container py-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div className="min-w-0">
            <h2 className="text-[1.35rem] font-bold">In an emergency</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Save these numbers now. Minutes matter after a crash: the first hour decides whether
              an injury becomes a fatality.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/campaigns" hash="emergency">
                What to do at a crash scene
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card px-4">
            {EMERGENCY_CONTACTS.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm">{c.name}</span>
                <span className="font-display text-lg font-bold">{c.number}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="public-content-container py-10">
        <FeaturedPageCard slot="home_page" />
      </section>

      <section className="border-t border-border bg-secondary/40">
        <div className="public-content-container space-y-8 py-10">
          <MjengoPreviews context="home" fullWidth />
        </div>
      </section>
    </div>
  );
}

function OfficialMetricCard({
  metric,
  fallback,
}: {
  metric?: Record<string, any>;
  fallback: string;
}) {
  return (
    <Link
      to="/statistics"
      className="rounded-lg border border-border bg-card/95 p-3 backdrop-blur transition-colors hover:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Stat
        value={metric ? num(metric.observation.value) : "—"}
        label={metric ? `Official national ${metric.metric_type.replaceAll("_", " ")}` : fallback}
      />
      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {metric
          ? `${metric.source_organization} · as of ${metric.observation.period_end}`
          : "Source and reporting period required"}
      </span>
    </Link>
  );
}

function Stat({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 p-4 backdrop-blur">
      <p className={`font-display text-3xl font-extrabold ${danger ? "text-destructive" : ""}`}>
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
