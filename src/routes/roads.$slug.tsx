/* eslint-disable @typescript-eslint/no-explicit-any -- public road rows span legacy and review schemas. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RoadGeometryMap } from "@/components/site/road-geometry-map";
import { SeverityBadge } from "@/components/site/severity-badge";
import { timeAgo } from "@/lib/format";
import { displayReportCount, fatalityLabel, knownReportSum } from "@/lib/report-metrics";
import { publicRoadGeometryLabel } from "@/lib/roads";

export const Route = createFileRoute("/roads/$slug")({
  head: () => ({
    meta: [
      { title: "Road Profile: Share Barabara" },
      {
        name: "description",
        content: "Verified road alerts, accident reports, news and safety context.",
      },
    ],
  }),
  component: RoadProfilePage,
});
function RoadProfilePage() {
  const { slug } = Route.useParams();
  const { data: road, isLoading } = useQuery({
    queryKey: ["road", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roads")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["road-alerts", road?.id],
    enabled: !!road?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("road_id", road.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as any[];
    },
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["road-reports", road?.id],
    enabled: !!road?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("road_id", road.id)
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as any[];
    },
  });
  const { data: articles = [] } = useQuery({
    queryKey: ["road-articles", road?.id],
    enabled: !!road?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("news") as any)
        .select("id,title,slug,summary,image_url,published_at,road_id")
        .eq("road_id", road.id)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("published_at", { ascending: false })
        .limit(12);
      if (error) return [];
      return data ?? [];
    },
  });
  const { data: nearby = [] } = useQuery({
    queryKey: ["nearby-roads", road?.id, road?.county],
    enabled: !!road?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("roads") as any)
        .select("id,name,slug,county,road_class")
        .neq("id", road.id)
        .eq("county", road.county)
        .order("name")
        .limit(6);
      if (error) return [];
      return data ?? [];
    },
  });
  if (isLoading)
    return (
      <p className="mx-auto max-w-5xl px-4 py-20 text-muted-foreground">Loading road profile…</p>
    );
  if (!road)
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-xl font-bold">Road not found</h1>
        <Link className="mt-4 inline-block underline" to="/roads">
          Back to roads
        </Link>
      </div>
    );
  const markers = [...reports, ...alerts]
    .filter((item: any) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .map((item: any) => ({
      id: item.id,
      longitude: item.longitude,
      latitude: item.latitude,
      title: item.title,
      href: `/reports/${item.id}`,
    }));
  const deaths = knownReportSum(reports.map((item) => item.fatalities));
  const injured = knownReportSum(reports.map((item) => item.casualties));
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Road profile
      </p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold">
        <MapPin className="size-8 text-accent" />
        {road.name}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {[road.road_class, road.county, road.authority].filter(Boolean).join(" · ") ||
          "Verified identifiers are being reviewed"}
      </p>
      {road.aliases?.length ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Also known as: {road.aliases.join(", ")}
        </p>
      ) : null}
      <section className="mt-6" aria-labelledby="road-map-heading">
        <h2 id="road-map-heading" className="text-lg font-bold">
          Road map
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {publicRoadGeometryLabel(road.geometry_confidence)}
          {road.geometry_source ? ` · ${road.geometry_source}` : ""}
        </p>
        <div className="mt-3">
          <RoadGeometryMap
            geometry={road.geometry ?? null}
            source={road.geometry_source}
            markers={markers}
          />
        </div>
      </section>
      <section className="mt-6" aria-labelledby="road-alerts-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="road-alerts-heading" className="text-xl font-bold">
            Latest alerts
          </h2>
          <Link
            className="text-sm font-semibold text-brand-blue underline"
            to="/alerts"
            search={{ road: road.id } as never}
          >
            View all road alerts
          </Link>
        </div>
        {alerts.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {alerts.slice(0, 3).map((item: any) => (
              <li key={item.id} className="rounded-lg border border-border bg-card p-4">
                <SeverityBadge value={item.severity} />
                <Link
                  className="mt-2 block font-semibold text-brand-blue hover:underline"
                  to="/alerts/$alertId"
                  params={{ alertId: item.id }}
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(item.created_at)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No published alerts are associated with this road.
          </p>
        )}
      </section>
      <section className="mt-6" aria-labelledby="road-reports-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="road-reports-heading" className="text-xl font-bold">
            Accident reports
          </h2>
          <Link
            className="text-sm font-semibold text-brand-blue underline"
            to="/reports"
            search={{ road: road.id } as never}
          >
            View all road reports
          </Link>
        </div>
        {reports.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {reports.slice(0, 3).map((item: any) => (
              <li key={item.id} className="rounded-lg border border-border bg-card p-4">
                <SeverityBadge value={item.severity} />
                <Link
                  className="mt-2 block font-semibold text-brand-blue hover:underline"
                  to="/reports/$reportId"
                  params={{ reportId: item.id }}
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {displayReportCount(item.fatalities)} {fatalityLabel(item.fatalities)} ·{" "}
                  {displayReportCount(item.casualties)} injured
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No published accident reports are associated with this road.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Totals: {deaths.hasUnknown ? "fatalities not confirmed" : `${deaths.value} fatalities`} ·{" "}
          {injured.hasUnknown ? "injuries not confirmed" : `${injured.value} injuries`}
        </p>
      </section>
      <section className="mt-6" aria-labelledby="road-news-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="road-news-heading" className="text-xl font-bold">
            News &amp; Articles
          </h2>
          <Link
            className="text-sm font-semibold text-brand-blue underline"
            to="/news"
            search={{ road: road.id } as never}
          >
            View all road articles
          </Link>
        </div>
        {articles.length ? (
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {articles.slice(0, 3).map((item: any) => (
              <li key={item.id} className="rounded-lg border border-border bg-card p-4">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="mb-3 aspect-video w-full rounded object-cover"
                  />
                ) : null}
                <Link
                  className="font-semibold text-brand-blue hover:underline"
                  to="/news/$slug"
                  params={{ slug: item.slug }}
                >
                  {item.title}
                </Link>
                {item.summary ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No published articles are tagged to this road.
          </p>
        )}
      </section>
      <section className="mt-6" aria-labelledby="nearby-roads-heading">
        <div className="flex items-end justify-between gap-3">
          <h2 id="nearby-roads-heading" className="text-xl font-bold">
            Nearby roads
          </h2>
          <Link className="text-sm font-semibold text-brand-blue underline" to="/roads">
            Browse all roads
          </Link>
        </div>
        {nearby.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((item: any) => (
              <li key={item.id}>
                <Link
                  className="inline-flex rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
                  to="/roads/$slug"
                  params={{ slug: item.slug }}
                >
                  {item.name}
                  {item.road_class ? ` · ${item.road_class}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No verified nearby-road relationship is available for this record.
          </p>
        )}
      </section>
      <section className="mt-6" aria-labelledby="road-explore-heading">
        <h2 id="road-explore-heading" className="text-xl font-bold">
          Explore Share Barabara
        </h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-brand-blue">
          <Link to="/alerts" className="underline">
            Alerts
          </Link>
          <Link to="/reports" className="underline">
            Accident reports
          </Link>
          <Link to="/news" className="underline">
            News &amp; Articles
          </Link>
          <Link to="/statistics" className="underline">
            Statistics
          </Link>
          <Link to="/feed" className="underline">
            Media &amp; Feed
          </Link>
        </div>
      </section>
    </main>
  );
}
