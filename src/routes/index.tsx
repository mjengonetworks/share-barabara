import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CarFront, Film, HandHeart, HeartHandshake, MapPin, Megaphone, TriangleAlert } from "lucide-react";
import heroRoad from "@/assets/hero-road.jpg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { num, timeAgo, longDate } from "@/lib/format";
import { EMERGENCY_CONTACTS, HAZARD_TYPES } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";
import { BannerAd } from "@/components/site/banner-ad";
import { SearchBar } from "@/components/site/search-bar";
import { QuoteOfTheDay } from "@/components/site/quote-of-the-day";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Share Barabara: Road Safety in Kenya" },
      {
        name: "description",
        content:
          "Live road hazard alerts, crash statistics, news and safety guidance for Kenya's roads. Report hazards, file accident reports and join the conversation.",
      },
      { property: "og:title", content: "Share Barabara: Road Safety in Kenya" },
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
        .select("*")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["home-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["home-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title")
        .eq("status", "featured")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: victimsArticles = [] } = useQuery({
    queryKey: ["home-victims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title")
        .eq("category", "Victims Focus")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(2);
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
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="hazard-stripe h-1.5 w-24 rounded" />
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-extrabold leading-tight sm:text-6xl">
            Every journey home should end at home.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Share Barabara brings together live hazard alerts, crash data and road
            safety news from across Kenya's 47 counties, reported by the people who
            use these roads every day.
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
          {latest ? (
            <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              <Stat value={num(latest.fatalities)} label={`deaths in ${latest.year}`} danger />
              <Stat value={num(latest.serious_injuries)} label="seriously injured" />
              <Stat value="~13" label="deaths every day" danger />
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold">Latest hazard alerts</h2>
          <div className="flex gap-3">
            <Button asChild size="sm">
              <Link to="/alerts">Submit alert</Link>
            </Button>
            <Link to="/alerts" className="self-center text-sm font-semibold text-accent-foreground underline">
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
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold">Road safety news</h2>
            <Link to="/news" className="text-sm font-semibold text-accent-foreground underline">
              Read more
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
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

      <section className="mx-auto max-w-6xl px-4 py-6">
        <BannerAd />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="flex items-center gap-2 text-3xl font-bold">
            <CarFront className="size-7 text-accent" /> Accident reports
          </h2>
          <div className="flex gap-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/reports">Submit report for review</Link>
            </Button>
            <Link to="/reports" className="self-center text-sm font-semibold text-accent-foreground underline">
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
              <article key={r.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={r.severity} />
                  <span className="ml-auto text-xs text-muted-foreground">{longDate(r.occurred_at)}</span>
                </div>
                <h3 className="mt-3 font-bold">{r.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" /> {r.county}{r.road ? ` · ${r.road}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <PreviewCard
            title="Crash statistics"
            body="Open, indicative crash data for Kenya, broken down by county, cause, vehicle type and time of day."
            to="/statistics"
            cta="View more"
          />
          <PreviewCard
            title="Campaigns"
            body="Share Barabara, our continuous road safety campaign, plus upcoming events and how to support them."
            to="/campaigns"
            cta="More"
            icon={Megaphone}
          />
          <PreviewCard
            title="Videos"
            body={videos.length > 0 ? `${videos.length}+ featured clips promoting road safety.` : "Road safety videos from the community."}
            to="/videos"
            cta="View more"
            icon={Film}
          />
          <PreviewCard
            title="Victims corner"
            body={victimsArticles[0]?.title ?? "Profiles and stories of those affected by road crashes."}
            to="/victims-focus"
            cta="View more"
            icon={HeartHandshake}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-lg border border-border bg-card p-8 text-center card-elevated">
          <HandHeart className="mx-auto size-8 text-accent" />
          <h2 className="mt-3 text-2xl font-bold">Support Share Barabara</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Your support funds campaigns like the Share Barabara Walk and hospital visits to crash
            victims.
          </p>
          <Button asChild className="mt-5">
            <Link to="/campaigns">Donate / support Share Barabara</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <BannerAd />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <QuoteOfTheDay />
          <div className="flex flex-col justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
            <Megaphone className="mx-auto size-7 text-accent" />
            <p className="mt-2 font-bold">Reach Kenyan road users</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Advertise your road-safety-related business on Share Barabara.
            </p>
            <Button asChild variant="outline" className="mt-4 self-center">
              <Link to="/partner-with-us">Advertise on the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">In an emergency</h2>
            <p className="mt-3 text-muted-foreground">
              Save these numbers now. Minutes matter after a crash: the first hour
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

function PreviewCard({
  title,
  body,
  to,
  cta,
  icon: Icon,
}: {
  title: string;
  body: string;
  to: string;
  cta: string;
  icon?: typeof Megaphone;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 card-elevated">
      {Icon ? <Icon className="size-6 text-accent" /> : null}
      <h3 className="mt-2 font-bold">{title}</h3>
      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{body}</p>
      <Link to={to} className="mt-3 inline-block text-sm font-semibold text-accent-foreground underline">
        {cta}
      </Link>
    </div>
  );
}
