import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, TriangleAlert } from "lucide-react";
import heroRoad from "@/assets/hero-road.jpg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { num, timeAgo } from "@/lib/format";
import { EMERGENCY_CONTACTS, HAZARD_TYPES } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Share Barabara — Road Safety in Kenya" },
      {
        name: "description",
        content:
          "Live road hazard alerts, crash statistics, news and safety guidance for Kenya's roads. Report hazards, file accident reports and join the conversation.",
      },
      { property: "og:title", content: "Share Barabara — Road Safety in Kenya" },
      {
        property: "og:description",
        content:
          "Live hazard alerts, crash data and safety guidance for every Kenyan road user.",
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: news = [] } = useQuery({
    queryKey: ["home-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: latest } = useQuery({
    queryKey: ["home-yearly"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("yearly_stats")
        .select("*")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <section className="relative isolate overflow-hidden">
        <img
          src={heroRoad}
          alt="Night-time long exposure of a Kenyan highway with light trails"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/40" />
        <div className="relative mx-auto max-w-6xl px-4 py-28">
          <div className="hazard-stripe h-1.5 w-24 rounded" />
          <h1 className="mt-6 max-w-3xl font-display text-5xl font-extrabold leading-tight sm:text-6xl">
            Every journey home should end at home.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Share Barabara brings together live hazard alerts, crash data and road
            safety news from across Kenya's 47 counties — reported by the people who
            use these roads every day.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/alerts">
                See live alerts <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/statistics">View the statistics</Link>
            </Button>
          </div>
          {latest ? (
            <div className="mt-12 grid max-w-2xl gap-4 sm:grid-cols-3">
              <Stat value={num(latest.fatalities)} label={`deaths in ${latest.year}`} danger />
              <Stat value={num(latest.serious_injuries)} label="seriously injured" />
              <Stat value="~13" label="deaths every day" danger />
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold">Latest hazard alerts</h2>
          <Link to="/alerts" className="text-sm font-semibold text-accent-foreground underline">
            All alerts
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="mt-6 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
            No alerts posted yet. Be the first to report a hazard on your route.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {alerts.map((a) => (
              <article key={a.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
                <div className="flex flex-wrap items-center gap-2">
                  <TriangleAlert className="size-4 text-caution" />
                  <SeverityBadge value={a.severity} />
                  <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {HAZARD_TYPES.find((h) => h.value === a.hazard_type)?.label ?? a.hazard_type}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{timeAgo(a.created_at)}</span>
                </div>
                <h3 className="mt-3 font-bold">{a.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" /> {a.county}{a.road ? ` · ${a.road}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold">Road safety news</h2>
            <Link to="/news" className="text-sm font-semibold text-accent-foreground underline">
              All news
            </Link>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {news.map((n) => (
              <Link
                key={n.id}
                to="/news/$slug"
                params={{ slug: n.slug }}
                className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent card-elevated"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  {n.category}
                </span>
                <h3 className="mt-2 font-bold leading-snug">{n.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">In an emergency</h2>
            <p className="mt-3 text-muted-foreground">
              Save these numbers now. Minutes matter after a crash — the first hour
              decides whether an injury becomes a fatality.
            </p>
            <Button asChild className="mt-6" variant="outline">
              <Link to="/safety">Read the safety guide</Link>
            </Button>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card px-6">
            {EMERGENCY_CONTACTS.map((c) => (
              <li key={c.name} className="flex items-center justify-between py-4">
                <span className="text-sm">{c.name}</span>
                <span className="font-display text-lg font-bold">{c.number}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
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
