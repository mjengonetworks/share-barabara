import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CarFront, MapPin, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo, longDate } from "@/lib/format";
import { SeverityBadge } from "@/components/site/severity-badge";

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

  const totalDeaths = reports.reduce((s, r) => s + r.fatalities, 0);
  const totalInjured = reports.reduce((s, r) => s + r.casualties, 0);

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

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="font-display text-3xl font-extrabold">{alerts.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Alerts recorded</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="font-display text-3xl font-extrabold text-destructive">{totalDeaths}</p>
          <p className="mt-1 text-sm text-muted-foreground">Deaths reported</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 card-elevated">
          <p className="font-display text-3xl font-extrabold text-caution">{totalInjured}</p>
          <p className="mt-1 text-sm text-muted-foreground">Injuries reported</p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-[1.155rem] font-bold">
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

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-[1.155rem] font-bold">
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
                  <span className="ml-auto text-xs text-muted-foreground">
                    {longDate(r.occurred_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.fatalities} deaths, {r.casualties} injured
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
