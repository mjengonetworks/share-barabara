import { Fragment, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { useVotes } from "@/hooks/useVotes";
import { useRoadsByIds } from "@/hooks/useRoadsByIds";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { VoteButtons } from "@/components/site/vote-buttons";
import { longDate, timeAgo } from "@/lib/format";
import { KENYA_COUNTIES, REPORT_SEVERITIES } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";
import { UserLink } from "@/components/site/user-link";
import { ReportForm } from "@/components/site/report-form";
import { BannerAd } from "@/components/site/banner-ad";

export const Route = createFileRoute("/reports/")({
  validateSearch: (search: Record<string, unknown>): { county?: string; severity?: string } => {
    const county = typeof search["county"] === "string" ? (search["county"] as string) : undefined;
    const severity =
      typeof search["severity"] === "string" ? (search["severity"] as string) : undefined;
    return { ...(county ? { county } : {}), ...(severity ? { severity } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Accident Reports from Kenyan Roads: Share Barabara" },
      {
        name: "description",
        content:
          "Community accident reports from across Kenya, reviewed and edited by our moderators, with location, vehicles involved, casualties and contributing factors.",
      },
      { property: "og:title", content: "Accident Reports from Kenyan Roads" },
      {
        property: "og:description",
        content: "Verified crash reports filed by Kenyan road users, open for discussion.",
      },
    ],
  }),
  component: ReportsPage,
});

type ReportCard = {
  id: string;
  title: string;
  severity: string;
  county: string;
  occurred_at: string;
};

function ReportMiniCard({ report }: { report: ReportCard }) {
  return (
    <Link
      to="/reports/$reportId"
      params={{ reportId: report.id }}
      className="block rounded-lg border border-border bg-card p-4 transition-colors card-elevated hover:border-accent"
    >
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge value={report.severity} />
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(report.occurred_at)}</span>
      </div>
      <p className="mt-2 font-semibold text-brand-blue hover:underline">{report.title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3" /> {report.county}
      </p>
    </Link>
  );
}

function ReportsPage() {
  const { user } = useAuth();
  const searchParams = Route.useSearch();
  const [county, setCounty] = useState(searchParams.county ?? "all");
  const [severity, setSeverity] = useState(searchParams.severity ?? "all");
  const [search, setSearch] = useState("");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const people = reports.flatMap((r) => [r.user_id, r.reviewed_by].filter(Boolean) as string[]);
  const { data: names = {} } = useProfileNames(people);
  const { data: verified = {} } = useSubscriptionStatuses(people);
  const { data: pages = {} } = usePagesByIds(reports.map((r) => r.page_id));
  const { data: roadMap = {} } = useRoadsByIds(reports.map((r) => r.road_id));
  const { scores, vote } = useVotes(
    "report",
    reports.map((r) => r.id),
  );
  const visible = reports.filter((r) => {
    const q = search.trim().toLowerCase();
    return (
      (county === "all" || r.county === county) &&
      (severity === "all" || r.severity === severity) &&
      (!q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.road ?? "").toLowerCase().includes(q))
    );
  });
  const latest = reports.slice(0, 3);

  const { data: trending = [] } = useQuery({
    queryKey: ["reports-trending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_reports", {
        hours_back: 48,
        result_limit: 3,
      });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Crash record
          </p>
          <h1 className="mt-2 text-4xl font-extrabold">Accident reports</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Crash reports filed by the community and reviewed by our editors before publication.
            Each report carries a shared byline: the road user who filed it and the editor who
            verified it.
          </p>
        </div>
        <Button asChild>
          <a href="#report-form">Submit a report</a>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {latest.length > 0 ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Latest reports</h2>
                <a href="#all-reports" className="text-sm font-semibold text-brand-blue underline">
                  See all
                </a>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {latest.map((r) => (
                  <li key={r.id}>
                    <ReportMiniCard report={r} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {trending.length > 0 ? (
            <div className="mt-12">
              <div className="flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-2xl font-bold">
                  <Flame className="size-6 text-destructive" /> Trending reports
                </h2>
                <a href="#all-reports" className="text-sm font-semibold text-brand-blue underline">
                  Read more
                </a>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {trending.map((r) => (
                  <li key={r.id}>
                    <ReportMiniCard report={r} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-12">
            <h2 className="text-lg font-bold text-muted-foreground">Browse by severity</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSeverity("all")}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  severity === "all"
                    ? "border-accent bg-accent/15 text-accent-foreground"
                    : "border-border bg-card hover:border-accent hover:text-accent-foreground"
                }`}
              >
                All severities
              </button>
              {REPORT_SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    severity === s.value
                      ? "border-accent bg-accent/15 text-accent-foreground"
                      : "border-border bg-card hover:border-accent hover:text-accent-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div id="all-reports" className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-bold">All reports</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <SelectItem value="all">All counties</SelectItem>
                {KENYA_COUNTIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, road or description…"
              className="w-64"
            />
          </div>

          {isLoading ? <p className="mt-8 text-muted-foreground">Loading reports…</p> : null}
          {!isLoading && visible.length === 0 ? (
            <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
              No published reports for this filter yet.
            </p>
          ) : null}

          <ul className="mt-6 space-y-6">
            {visible.map((r, i) => (
              <Fragment key={r.id}>
                {i === 2 ? (
                  <li key="ad">
                    <BannerAd />
                  </li>
                ) : null}
                <li className="rounded-lg border border-border bg-card p-5 card-elevated">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="-mx-5 -mt-5 mb-4 aspect-video w-[calc(100%+2.5rem)] rounded-t-lg object-cover"
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge value={r.severity} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      {longDate(r.occurred_at)}
                    </span>
                  </div>
                  <Link to="/reports/$reportId" params={{ reportId: r.id }} className="group">
                    <h2 className="mt-3 text-lg font-bold text-brand-blue group-hover:underline">
                      {r.title}
                    </h2>
                  </Link>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4" /> {r.county}
                    {r.road ? (
                      <>
                        {" · "}
                        {(() => {
                          const linked = roadMap[r.road_id ?? ""];
                          return linked ? (
                            <Link
                              to="/roads/$slug"
                              params={{ slug: linked.slug }}
                              className="underline"
                            >
                              {r.road}
                            </Link>
                          ) : (
                            r.road
                          );
                        })()}
                      </>
                    ) : null}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Reported by{" "}
                    <UserLink
                      userId={r.user_id}
                      name={names[r.user_id]}
                      anonymous={r.is_anonymous}
                      verified={r.page_id ? !!pages[r.page_id]?.verified : !!verified[r.user_id]}
                      pageSlug={r.page_id ? pages[r.page_id]?.slug : undefined}
                      pageName={r.page_id ? pages[r.page_id]?.name : undefined}
                    />
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span>
                      <strong>{r.vehicles_involved}</strong> vehicles
                    </span>
                    <span>
                      <strong>{r.casualties}</strong> injured
                    </span>
                    <span className="text-destructive">
                      <strong>{r.fatalities}</strong> deaths
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-foreground/90">{r.description}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <VoteButtons
                      net={scores[r.id]?.net ?? 0}
                      mine={scores[r.id]?.mine ?? 0}
                      onVote={(v) => vote(r.id, v)}
                    />
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: r.id }}
                      className="text-sm font-semibold text-brand-blue underline"
                    >
                      Read more
                    </Link>
                  </div>
                </li>
              </Fragment>
            ))}
          </ul>
        </div>

        <aside
          id="report-form"
          className="h-fit scroll-mt-24 rounded-lg border border-border bg-card p-6 card-elevated lg:sticky lg:top-24"
        >
          <h2 className="text-lg font-bold">File a report</h2>
          {user ? (
            <div className="mt-4">
              <ReportForm />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to file an accident report. Call 999 or 112 first if anyone is injured.
              </p>
              <Button asChild className="mt-4 w-full">
                <Link to="/auth">Sign in to report</Link>
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
