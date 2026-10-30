import { Fragment, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { KENYA_COUNTIES } from "@/lib/constants";
import { useReportSeverities } from "@/hooks/useTaxonomy";
import { SeverityBadge } from "@/components/site/severity-badge";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { GlobalEditorialPreview } from "@/components/site/global-editorial-preview";
import { EditorialDiscoveryRail } from "@/components/site/editorial-discovery";
import { UserLink } from "@/components/site/user-link";
import { ReportForm } from "@/components/site/report-form";
import { ReportPreviewCard } from "@/components/site/discovery-sections";
import { BannerAd } from "@/components/site/banner-ad";
import { displayReportCount } from "@/lib/report-metrics";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { useIncidentTaxonomy } from "@/hooks/useIncidentTaxonomy";
import { descendantsOf, incidentLabel } from "@/lib/incident-taxonomy";
import { isAdInterval } from "@/lib/ad-placement";
import {
  IncidentEntityGroups,
  EditorialBand,
  SectionHeader,
  type PublicIncidentCard,
} from "@/components/site/public-layout";
import {
  publicCategoryNavigationClass,
  publicCategoryNavigationSelectedClass,
} from "@/components/site/public-ui";

export const Route = createFileRoute("/reports/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { county?: string; road?: string; severity?: string; incident?: string } => {
    const county = typeof search["county"] === "string" ? (search["county"] as string) : undefined;
    const severity =
      typeof search["severity"] === "string" ? (search["severity"] as string) : undefined;
    const road = typeof search["road"] === "string" ? (search["road"] as string) : undefined;
    const incident =
      typeof search["incident"] === "string" ? (search["incident"] as string) : undefined;
    return {
      ...(county ? { county } : {}),
      ...(road ? { road } : {}),
      ...(severity ? { severity } : {}),
      ...(incident ? { incident } : {}),
    };
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

function ReportsPage() {
  const { user } = useAuth();
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: "/reports/" }) as unknown as (options: { search: unknown }) => Promise<void>;
  const [county, setCounty] = useState(searchParams.county ?? "all");
  const [road, setRoad] = useState(searchParams.road ?? "all");
  const [severity, setSeverity] = useState(searchParams.severity ?? "all");
  const [incident, setIncident] = useState(searchParams.incident ?? "all");
  const [search, setSearch] = useState("");
  const { data: severities = [] } = useReportSeverities();
  const { data: incidentTypes = [] } = useIncidentTaxonomy();

  useEffect(() => {
    setCounty(searchParams.county ?? "all");
    setRoad(searchParams.road ?? "all");
    setSeverity(searchParams.severity ?? "all");
    setIncident(searchParams.incident ?? "all");
  }, [searchParams.county, searchParams.road, searchParams.severity, searchParams.incident]);

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
    const incidentValues = incident === "all" ? null : descendantsOf(incidentTypes, incident);
    return (
      (county === "all" || r.county === county) &&
      (road === "all" || r.road_id === road) &&
      (severity === "all" || r.severity === severity) &&
      (!incidentValues ||
        incidentValues.has((r as { incident_type?: string | null }).incident_type ?? "")) &&
      (!q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.road ?? "").toLowerCase().includes(q))
    );
  });
  const latest = visible.slice(0, 12);
  const featured = visible
    .filter((r) => Boolean((r as { featured?: boolean | null }).featured))
    .slice(0, 12);

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#report-form") return;
    const form = document.getElementById("report-form");
    if (!form) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() => form.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }));
  }, [featured.length, latest.length, isLoading]);

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
  const trendingIds = new Set((trending as Array<{ id: string }>).map((item) => item.id));
  const rankedTrending = visible.filter((report) => trendingIds.has(report.id)).slice(0, 12);
  const hasDiscoveryFilter = county !== "all" || road !== "all" || severity !== "all" || incident !== "all";

  const reportActions = (item: PublicIncidentCard) => (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <VoteButtons
        net={scores[item.id]?.net ?? 0}
        mine={scores[item.id]?.mine ?? 0}
        onVote={(value) => vote(item.id, value)}
      />
      <Link
        to="/reports/$reportId"
        params={{ reportId: item.id }}
        className="font-semibold text-brand-blue hover:underline"
      >
        Read more
      </Link>
    </div>
  );

  const reportSubmissionCard = (
    <section id="report-form" className="scroll-mt-24 rounded-lg border border-border bg-card p-4 card-elevated sm:p-5">
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
    </section>
  );

  return (
    <div className="w-full py-4 sm:py-6">
      <PublicPageHero
        eyebrow="Community reporting"
        title={hasDiscoveryFilter ? "Filtered accident reports" : "Crash and incident reports"}
        description={hasDiscoveryFilter ? "Browse the eligible accident reports matching the selected county, road, incident type and severity filters." : "Browse approved road-safety reports from the community, or contribute useful information about an incident you know."}
        compact
        primaryCta={{ label: "Submit a report", to: "/reports#report-form" }}
      />

      <div className="mx-auto mt-5 max-w-[1500px] px-4 sm:px-6">
        <div className="min-w-0">
            {latest.length > 0 ? (
              <EditorialBand tone="plain">
                <SectionHeader
                  eyebrow="Newest approved incidents"
                  title="Latest Accident Reports"
                  to="/reports"
                  actionLabel="View all"
                />
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {latest.slice(0, 3).map((report) => (
                    <ReportPreviewCard key={report.id} report={report} />
                  ))}
                </div>
                <div className="mt-5 text-center">
                  <Link to="/reports" className="text-sm font-bold text-brand-blue underline underline-offset-4">
                    Read more
                  </Link>
                </div>
              </EditorialBand>
            ) : null}

            <EditorialBand tone="pale">
              <SectionHeader
                eyebrow="Editor-selected public coverage"
                title="Featured Accident Reports"
                to="/reports"
                actionLabel="View all"
              />
              {featured.length ? (
                <>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.slice(0, 3).map((report) => <ReportPreviewCard key={report.id} report={report} />)}
                  </div>
                  <div className="mt-4 text-center"><Link to="/reports" className="text-sm font-bold text-brand-blue underline underline-offset-4">Read more</Link></div>
                </>
              ) : (
                <p className="mt-4 rounded border border-dashed border-border p-4 text-sm text-muted-foreground">Editors have not selected Featured Reports yet.</p>
              )}
            </EditorialBand>

            {featured.length >= 2 ? (
              <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {reportSubmissionCard}
                {featured.slice(0, 2).map((report) => <ReportPreviewCard key={`submission-${report.id}`} report={report} />)}
              </div>
            ) : (
              <div className="mt-5 max-w-xl">{reportSubmissionCard}</div>
            )}

            <div className="mt-5"><BannerAd placement="reports-list-interval-1" /></div>
            {rankedTrending.length > 0 ? (
              <EditorialBand tone="plain">
                <SectionHeader
                  eyebrow="Ranked by recorded views"
                  title="Trending / Most Viewed Reports"
                  icon={<Flame className="size-5 text-destructive" />}
                  to="/reports"
                  actionLabel="View all"
                />
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rankedTrending.slice(0, 3).map((report) => (
                    <ReportPreviewCard key={report.id} report={report} />
                  ))}
                </div>
                <div className="mt-5 text-center">
                  <Link to="/reports" className="text-sm font-bold text-brand-blue underline underline-offset-4">
                    Read more
                  </Link>
                </div>
              </EditorialBand>
            ) : null}

            <GlobalEditorialPreview destination="reports" topic={incident !== "all" ? incident : null} />
            <EditorialDiscoveryRail exclude="reports" />

            <EditorialBand tone="plain" className="mt-4">
              <h2 className="text-lg font-bold text-muted-foreground">Browse by severity</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => { setSeverity("all"); void navigate({ search: (previous: Record<string, string | undefined>) => ({ ...previous, severity: undefined }) }); }}
                  className={
                    severity === "all" ? publicCategoryNavigationSelectedClass : publicCategoryNavigationClass
                  }
                >
                  All severities
                </button>
                {severities.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => { setSeverity(s.value); void navigate({ search: (previous: Record<string, string | undefined>) => ({ ...previous, severity: s.value }) }); }}
                    className={
                      severity === s.value
                        ? publicCategoryNavigationSelectedClass
                        : publicCategoryNavigationClass
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </EditorialBand>

            <div id="all-reports" className="mt-4 scroll-mt-24">
              <SectionHeader
                eyebrow="Browse all eligible reports"
                title="Browse All Accident Reports"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Select value={county} onValueChange={(value) => { setCounty(value); void navigate({ search: (previous: Record<string, string | undefined>) => ({ ...previous, county: value === "all" ? undefined : value }) }); }}>
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
              <Select value={road} onValueChange={(value) => { setRoad(value); void navigate({ search: (previous: Record<string, string | undefined>) => ({ ...previous, road: value === "all" ? undefined : value }) }); }}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Road" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All roads</SelectItem>
                  {Object.entries(roadMap).map(([id, item]) => (
                    <SelectItem key={id} value={id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={incident} onValueChange={(value) => { setIncident(value); void navigate({ search: (previous: Record<string, string | undefined>) => ({ ...previous, incident: value === "all" ? undefined : value }) }); }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Incident type" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="all">All incident types</SelectItem>
                  {incidentTypes.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.parent_value
                        ? `${incidentLabel(incidentTypes, item.parent_value)} · `
                        : ""}
                      {item.label}
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
              {hasDiscoveryFilter ? <Button variant="ghost" size="sm" onClick={() => { setCounty("all"); setRoad("all"); setSeverity("all"); setIncident("all"); void navigate({ search: {} }); }}>Clear all filters</Button> : null}
            </div>

            {isLoading ? <p className="mt-8 text-muted-foreground">Loading reports…</p> : null}
            {!isLoading && visible.length === 0 ? (
              <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
                No published reports for this filter yet.
              </p>
            ) : null}

            <div className="mt-6">
              <IncidentEntityGroups
                items={visible as PublicIncidentCard[]}
                kind="report"
                getEntity={(item) => item.incident_type ?? "Other reports"}
                renderActions={reportActions}
              />
            </div>
        </div>
      </div>
      <MjengoPreviews context="reports" />
    </div>
  );
}
