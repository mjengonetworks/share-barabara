import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CarFront, MapPin, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";
import { SeverityBadge } from "@/components/site/severity-badge";
import { displayReportCount, fatalityLabel, knownReportSum } from "@/lib/report-metrics";
import { RoadGeometryMap } from "@/components/site/road-geometry-map";

export const Route = createFileRoute("/roads/$slug")({
  head: () => ({
    meta: [
      { title: "Road Profile: Share Barabara" },
      {
        name: "description",
        content: "Alerts, accident reports and safety statistics for a specific Kenyan road.",
      },
    ],
  }),
  component: RoadProfilePage,
});

function RoadProfilePage() {
  const { slug } = Route.useParams();

  const { data: road, isLoading: roadLoading } = useQuery({
    queryKey: ["road", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roads")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["road-alerts", road?.id],
    enabled: !!road?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("road_id", road!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["road-reports", road?.id],
    enabled: !!road?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("road_id", road!.id)
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedArticles = [] } = useQuery({
    queryKey: ["road-articles", road?.id],
    enabled: !!road?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("news") as any)
        .select("id,title,slug,published_at,featured,latitude,longitude")
        .eq("road_id", road!.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false }).limit(12);
      if (error) return [];
      return data ?? [];
    },
  });

  if (roadLoading) {
    return (
      <p className="mx-auto max-w-5xl px-4 py-20 text-muted-foreground">Loading road profile…</p>
    );
  }

  if (!road) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-[1.155rem] font-bold">Road not found</h1>
        <Link to="/alerts" className="mt-4 inline-block underline">
          Back to alerts
        </Link>
      </div>
    );
  }

  const totalDeaths = knownReportSum(reports.map((r) => r.fatalities));
  const totalInjured = knownReportSum(reports.map((r) => r.casualties));
  const roadGeometry = (road as typeof road & { geometry?: unknown; geometry_source?: string | null }).geometry;
  const featuredReports = reports.filter((item: any) => item.featured === true).slice(0, 3);
  const trendingReports = [...reports].sort((a: any, b: any) => (b.views_count ?? b.view_count ?? 0) - (a.views_count ?? a.view_count ?? 0)).slice(0, 3);
  const verifiedIncidentMarkers = [...reports, ...alerts].filter((item: any) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Road profile
      </p>
      <h1 className="mt-2 flex items-center gap-2 text-[1.7325rem] font-extrabold">
        <MapPin className="size-8 text-accent" /> {road.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {[road.county, road.road_class, road.surface].filter(Boolean).join(" · ") ||
          "Not yet classified by county, class or surface"}
      </p>

      <section className="mt-6" aria-labelledby="road-map-heading">
        <h2 id="road-map-heading" className="text-lg font-bold">Verified road map</h2>
        <div className="mt-3"><RoadGeometryMap geometry={roadGeometry} source={(road as typeof road & { geometry_source?: string | null }).geometry_source ?? null} /></div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="font-display text-3xl font-extrabold">{alerts.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Alerts recorded</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="font-display text-3xl font-extrabold text-destructive">{totalDeaths.hasUnknown ? "Not confirmed" : totalDeaths.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">Fatalities reported</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="font-display text-3xl font-extrabold text-caution">{totalInjured.hasUnknown ? "Not confirmed" : totalInjured.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">Injuries reported</p>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="road-latest-heading">
        <h2 id="road-latest-heading" className="text-lg font-bold">Latest</h2>
        {alerts.length === 0 && reports.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No eligible road content is available yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {[...reports.slice(0, 2).map((item) => ({ id: item.id, title: item.title, href: `/reports/${item.id}` })), ...alerts.slice(0, 1).map((item) => ({ id: item.id, title: item.title, href: `/alerts/${item.id}` }))].map((item) => (
              <li key={item.id}><a className="font-semibold text-brand-blue underline" href={item.href}>{item.title}</a></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="road-featured-heading">
        <h2 id="road-featured-heading" className="text-lg font-bold">Featured</h2>
        {featuredReports.length ? <ul className="mt-3 grid gap-3 sm:grid-cols-3">{featuredReports.map((item: any) => <li key={item.id}><Link className="font-semibold text-brand-blue underline" to="/reports/$reportId" params={{ reportId: item.id }}>{item.title}</Link></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No eligible featured road content is selected.</p>}
      </section>

      <section className="mt-8" aria-labelledby="road-trending-heading">
        <h2 id="road-trending-heading" className="text-lg font-bold">Trending</h2>
        {trendingReports.length ? <ol className="mt-3 space-y-2 text-sm">{trendingReports.map((item: any, index: number) => <li key={item.id}><span className="mr-2 font-bold text-muted-foreground">{index + 1}.</span><Link className="font-semibold text-brand-blue underline" to="/reports/$reportId" params={{ reportId: item.id }}>{item.title}</Link></li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">Trending is unavailable until verified view data exists.</p>}
      </section>

      <section className="mt-8" aria-labelledby="road-markers-heading">
        <h2 id="road-markers-heading" className="text-lg font-bold">Verified incident locations</h2>
        <p className="mt-2 text-sm text-muted-foreground">Only records with verified coordinates are listed as map markers. Records without coordinates remain in the content lists and are not pinned.</p>
        {verifiedIncidentMarkers.length ? <ul className="mt-3 space-y-2 text-sm">{verifiedIncidentMarkers.map((item: any) => <li key={item.id}>{item.title} <span className="text-muted-foreground">({item.latitude}, {item.longitude})</span></li>)}</ul> : null}
      </section>

      <section className="mt-8" aria-labelledby="road-related-heading">
        <h2 id="road-related-heading" className="text-lg font-bold">Related Share Barabara sections</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-brand-blue">
          <Link to="/news" className="underline">News &amp; Articles</Link>
          <Link to="/infrastructure-issues" className="underline">Infrastructure Issues</Link>
          <Link to="/campaigns" className="underline">Campaigns</Link>
          <a href="/feed" className="underline">Media &amp; Feed</a>
        </div>
        {relatedArticles.length ? <div className="mt-4"><h3 className="font-semibold">Related News &amp; Articles</h3><ul className="mt-2 space-y-2 text-sm">{relatedArticles.slice(0, 3).map((item: any) => <li key={item.id}><Link to="/news/$slug" params={{ slug: item.slug }} className="text-brand-blue underline">{item.title}</Link></li>)}</ul></div> : null}
      </section>

      <section className="mt-8" aria-labelledby="road-categories-heading">
        <h2 id="road-categories-heading" className="text-lg font-bold">Related categories</h2>
        <p className="mt-2 text-sm text-muted-foreground">Categories appear when verified taxonomy associations exist.</p>
      </section>

      <section className="mt-8" aria-labelledby="road-alerts-heading">
        <h2 id="road-alerts-heading" className="flex items-center gap-2 text-[1.155rem] font-bold">
          <TriangleAlert className="size-5 text-caution" /> Alerts on this road
        </h2>
        {alerts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No alerts recorded here yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={a.severity} />
                  <Link
                    to="/alerts/$alertId"
                    params={{ alertId: a.id }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {a.title}
                  </Link>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="road-reports-heading">
        <h2 id="road-reports-heading" className="flex items-center gap-2 text-[1.155rem] font-bold">
          <CarFront className="size-5 text-accent" /> Accident reports on this road
        </h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No published reports here yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={r.severity} />
                  <Link
                    to="/reports/$reportId"
                    params={{ reportId: r.id }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {r.title}
                  </Link>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {displayReportCount(r.fatalities)} {fatalityLabel(r.fatalities)}, {displayReportCount(r.casualties)} injured
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="road-browse-heading">
        <h2 id="road-browse-heading" className="text-lg font-bold">Browse All</h2>
        <p className="mt-2 text-sm text-muted-foreground">Browse all eligible content for {road.name} using the Report and Alert directories.</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-brand-blue">
          <Link to="/reports" search={{ road: road.id } as never} className="underline">All reports</Link>
          <Link to="/alerts" search={{ road: road.id } as never} className="underline">All alerts</Link>
        </div>
      </section>
    </div>
  );
}
