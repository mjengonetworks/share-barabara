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
import { KENYA_COUNTIES } from "@/lib/constants";
import { useReportSeverities } from "@/hooks/useTaxonomy";
import { SeverityBadge } from "@/components/site/severity-badge";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { UserLink } from "@/components/site/user-link";
import { ReportForm } from "@/components/site/report-form";
import { BannerAd } from "@/components/site/banner-ad";
import { displayReportCount } from "@/lib/report-metrics";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { useIncidentTaxonomy } from "@/hooks/useIncidentTaxonomy";
import { descendantsOf, incidentLabel } from "@/lib/incident-taxonomy";
import { isAdInterval } from "@/lib/ad-placement";
import {
  CompactIncidentColumns,
  EditorialBand,
  SectionHeader,
  type PublicIncidentCard,
} from "@/components/site/public-layout";
import {
  publicCategoryBadgeClass,
  publicCategoryBadgeSelectedClass,
} from "@/components/site/public-ui";

export const Route = createFileRoute("/reports/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { county?: string; severity?: string; incident?: string } => {
    const county = typeof search["county"] === "string" ? (search["county"] as string) : undefined;
    const severity =
      typeof search["severity"] === "string" ? (search["severity"] as string) : undefined;
    const incident =
      typeof search["incident"] === "string" ? (search["incident"] as string) : undefined;
    return {
      ...(county ? { county } : {}),
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
  const [county, setCounty] = useState(searchParams.county ?? "all");
  const [severity, setSeverity] = useState(searchParams.severity ?? "all");
  const [incident, setIncident] = useState(searchParams.incident ?? "all");
  const [search, setSearch] = useState("");
  const { data: severities = [] } = useReportSeverities();
  const { data: incidentTypes = [] } = useIncidentTaxonomy();

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
      (severity === "all" || r.severity === severity) &&
      (!incidentValues ||
        incidentValues.has((r as { incident_type?: string | null }).incident_type ?? "")) &&
      (!q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.road ?? "").toLowerCase().includes(q))
    );
  });
  const latest = reports.slice(0, 12);
  const featured = reports.filter((r) => /critical|high/i.test(r.severity ?? "")).slice(0, 12);

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

  return (
    <div className="w-full py-8 sm:py-10">
      <PublicPageHero
        eyebrow="Community reporting"
        title="Crash and incident reports"
        description="Browse approved road-safety reports from the community, or contribute useful information about an incident you know."
        primaryCta={{ label: "Submit a report", to: "/reports#report-form" }}
      />

      <div className="mx-auto mt-8 max-w-[1500px] px-4 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)]">
          <div className="min-w-0">
            {featured.length > 0 ? (
              <EditorialBand tone="pale">
                <SectionHeader
                  eyebrow="Verified high-severity incidents"
                  title="Featured Accident Reports"
                  to="/reports"
                  actionLabel="View all"
                />
                <div className="mt-5">
                  <CompactIncidentColumns
                    items={featured as PublicIncidentCard[]}
                    kind="report"
                    titles={["Priority incidents", "Verified reports", "Road context"]}
                    placement="reports-featured"
                    renderActions={reportActions}
                  />
                </div>
              </EditorialBand>
            ) : null}

            {latest.length > 0 ? (
              <EditorialBand tone="plain">
                <SectionHeader
                  eyebrow="Newest approved incidents"
                  title="Latest Accident Reports"
                  to="/reports"
                  actionLabel="View all"
                />
                <div className="mt-5">
                  <CompactIncidentColumns
                    items={latest as PublicIncidentCard[]}
                    kind="report"
                    titles={["Latest reports", "On the road", "Community watch"]}
                    placement="reports-latest"
                    renderActions={reportActions}
                  />
                </div>
              </EditorialBand>
            ) : null}
            <div className="mt-6">
              <BannerAd placement="reports-list-interval-1" />
            </div>
            {trending.length > 0 ? (
              <EditorialBand tone="pale">
                <SectionHeader
                  eyebrow="Verified activity"
                  title="Trending Reports"
                  icon={<Flame className="size-5 text-destructive" />}
                />
                <div className="mt-5">
                  <CompactIncidentColumns
                    items={trending as PublicIncidentCard[]}
                    kind="report"
                    titles={["Most opened", "Trending now", "More viewed"]}
                    placement="reports-trending"
                  />
                </div>
              </EditorialBand>
            ) : null}

            <EditorialBand tone="plain" className="mt-8">
              <h2 className="text-lg font-bold text-muted-foreground">Browse by severity</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setSeverity("all")}
                  className={
                    severity === "all"
                      ? publicCategoryBadgeSelectedClass
                      : publicCategoryBadgeClass
                  }
                >
                  All severities
                </button>
                {severities.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSeverity(s.value)}
                    className={
                      severity === s.value
                        ? publicCategoryBadgeSelectedClass
                        : publicCategoryBadgeClass
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </EditorialBand>

            <div id="all-reports" className="mt-8 scroll-mt-24">
              <SectionHeader
                eyebrow="Approved public records"
                title="Reports by County, Road and Incident Type"
              />
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
              <Select value={incident} onValueChange={setIncident}>
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
            </div>

            {isLoading ? <p className="mt-8 text-muted-foreground">Loading reports…</p> : null}
            {!isLoading && visible.length === 0 ? (
              <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
                No published reports for this filter yet.
              </p>
            ) : null}

            <div className="mt-6">
              <CompactIncidentColumns
                items={visible as PublicIncidentCard[]}
                kind="report"
                titles={["Filtered reports", "County watch", "Road watch"]}
                placement="reports-filtered"
                renderActions={reportActions}
              />
            </div>
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
      <MjengoPreviews context="reports" />
    </div>
  );
}
