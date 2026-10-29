import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, MapPin, TriangleAlert, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames, useProfileUsernames } from "@/lib/profiles";
import { useVotes } from "@/hooks/useVotes";
import { useRoadsByIds } from "@/hooks/useRoadsByIds";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { useProfileLeaderboard } from "@/hooks/useContributionLeaderboards";
import { timeAgo } from "@/lib/format";
import { KENYA_COUNTIES } from "@/lib/constants";
import { useIncidentTaxonomy } from "@/hooks/useIncidentTaxonomy";
import { descendantsOf } from "@/lib/incident-taxonomy";
import { isAdInterval } from "@/lib/ad-placement";
import { SeverityBadge } from "@/components/site/severity-badge";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { GlobalEditorialPreview } from "@/components/site/global-editorial-preview";
import { EditorialDiscoveryRail } from "@/components/site/editorial-discovery";
import { VoteButtons } from "@/components/site/vote-buttons";
import { UserLink } from "@/components/site/user-link";
import { AlertForm } from "@/components/site/alert-form";
import { AlertPreviewCard } from "@/components/site/discovery-sections";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { PublicPageHero } from "@/components/site/public-page-hero";
import heroRoad from "@/assets/hero-road.jpg";
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

export const Route = createFileRoute("/alerts/")({
  validateSearch: (search: Record<string, unknown>): { county?: string; hazard?: string } => {
    const county = typeof search["county"] === "string" ? (search["county"] as string) : undefined;
    const hazard = typeof search["hazard"] === "string" ? (search["hazard"] as string) : undefined;
    return { ...(county ? { county } : {}), ...(hazard ? { hazard } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Live Road Hazard Alerts in Kenya: Share Barabara" },
      {
        name: "description",
        content:
          "Community-reported road hazards across Kenya: crashes, flooding, potholes, obstructions and reckless driving, filtered by county.",
      },
      { property: "og:title", content: "Live Road Hazard Alerts in Kenya" },
      {
        property: "og:description",
        content:
          "See what Kenyan drivers, riders and passengers are reporting on the road right now.",
      },
    ],
  }),
  component: AlertsPage,
});

type AlertCard = {
  id: string;
  title: string;
  severity: string;
  county: string;
  created_at: string;
};

function AlertMiniCard({ alert }: { alert: AlertCard }) {
  return (
    <Link
      to="/alerts/$alertId"
      params={{ alertId: alert.id }}
      className="block rounded-lg border border-border bg-card p-4 transition-colors card-elevated hover:border-accent"
    >
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge value={alert.severity} />
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
      </div>
      <p className="mt-2 font-semibold text-brand-blue hover:underline">{alert.title}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="size-3" /> {alert.county}
      </p>
    </Link>
  );
}

function AlertsPage() {
  const { user } = useAuth();
  const searchParams = Route.useSearch();
  const [county, setCounty] = useState(searchParams.county ?? "all");
  const [hazard, setHazard] = useState(searchParams.hazard ?? "all");
  const [status, setStatus] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: hazardTypes = [] } = useIncidentTaxonomy();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(alerts.map((a) => a.user_id));
  const { data: verified = {} } = useSubscriptionStatuses(alerts.map((a) => a.user_id));
  const { data: pages = {} } = usePagesByIds(alerts.map((a) => a.page_id));
  const { data: roadMap = {} } = useRoadsByIds(alerts.map((a) => a.road_id));
  const { scores, vote } = useVotes(
    "alert",
    alerts.map((a) => a.id),
  );

  const selectedHazards = hazard === "all" ? null : descendantsOf(hazardTypes, hazard);
  const visible = alerts.filter(
    (a) =>
      (county === "all" || a.county === county) &&
      (status === "all" || a.status === status) &&
      (!selectedHazards || selectedHazards.has(a.hazard_type)),
  );
  const latest = alerts.slice(0, 12);
  const featured = alerts
    .filter((a) => Boolean((a as { featured?: boolean | null }).featured))
    .slice(0, 12);

  const { data: trending = [] } = useQuery({
    queryKey: ["alerts-trending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_alerts", {
        hours_back: 24,
        result_limit: 3,
      });
      if (error) throw error;
      return data;
    },
  });

  const alertActions = (item: PublicIncidentCard) => (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <VoteButtons
        net={scores[item.id]?.net ?? 0}
        mine={scores[item.id]?.mine ?? 0}
        onVote={(value) => vote(item.id, value)}
      />
      <button
        type="button"
        className="font-semibold text-brand-blue hover:underline"
        onClick={() => setOpenId(openId === item.id ? null : item.id)}
      >
        {openId === item.id ? "Hide discussion" : "Discussion"}
      </button>
      <Link
        to="/alerts/$alertId"
        params={{ alertId: item.id }}
        className="font-semibold text-brand-blue hover:underline"
      >
        Read more
      </Link>
      {openId === item.id ? <CommentSection entityType="alert" entityId={item.id} /> : null}
    </div>
  );

  const hazardSubmissionCard = (
    <section id="alert-form" className="scroll-mt-24 rounded-lg border border-border bg-card p-4 card-elevated sm:p-5">
      <h2 className="text-lg font-bold">Report a hazard</h2>
      {user ? (
        <div className="mt-4">
          <AlertForm />
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in to publish an alert. Never use your phone while driving: stop safely first, or ask a passenger to report.
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
        eyebrow="Community road watch"
        title="Road hazard alerts"
        description="Current hazards, closures and disruptions reported by road users across Kenya. Check what is ahead and share what you see on your route."
        image={heroRoad}
        compact
        primaryCta={{ label: "Submit an alert", to: "/alerts#alert-form" }}
      />

      <div className="mx-auto mt-5 max-w-[1500px] px-4 sm:px-6">
        <div className="min-w-0">
            {latest.length > 0 ? (
              <EditorialBand tone="plain">
                <SectionHeader
                  eyebrow="Newest published alerts"
                  title="Latest Alerts"
                  to="/alerts"
                  actionLabel="View all"
                />
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {latest.slice(0, 3).map((alert) => (
                    <AlertPreviewCard key={alert.id} alert={alert as any} />
                  ))}
                </div>
                <div className="mt-5 text-center">
                  <Link to="/alerts" className="text-sm font-bold text-brand-blue underline underline-offset-4">
                    Read more
                  </Link>
                </div>
              </EditorialBand>
            ) : null}

            <EditorialBand tone="pale">
              <SectionHeader
                eyebrow="Editor-selected public road watch"
                title="Featured Alerts"
                to="/alerts"
                actionLabel="View all"
              />
              {featured.length ? (
                <>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.slice(0, 3).map((alert) => <AlertPreviewCard key={alert.id} alert={alert as any} />)}
                  </div>
                  <div className="mt-4 text-center"><Link to="/alerts" className="text-sm font-bold text-brand-blue underline underline-offset-4">Read more</Link></div>
                </>
              ) : (
                <p className="mt-4 rounded border border-dashed border-border p-4 text-sm text-muted-foreground">Editors have not selected Featured Alerts yet.</p>
              )}
            </EditorialBand>

            {featured.length >= 2 ? (
              <div className="mt-5 grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {hazardSubmissionCard}
                {featured.slice(0, 2).map((alert) => <AlertPreviewCard key={`submission-${alert.id}`} alert={alert as any} />)}
              </div>
            ) : <div className="mt-5 max-w-xl">{hazardSubmissionCard}</div>}

            <div className="mt-5"><BannerAd placement="alerts-list-interval-1" /></div>
            {trending.length > 0 ? (
              <EditorialBand tone="plain">
                <SectionHeader
                  eyebrow="Ranked by recorded views"
                  title="Trending / Most Viewed Alerts"
                  icon={<Flame className="size-5 text-destructive" />}
                />
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {trending.slice(0, 3).map((alert) => (
                    <AlertPreviewCard key={alert.id} alert={alert as any} />
                  ))}
                </div>
                <div className="mt-5 text-center">
                  <Link to="/alerts" className="text-sm font-bold text-brand-blue underline underline-offset-4">
                    Read more
                  </Link>
                </div>
              </EditorialBand>
            ) : null}

            <EditorialBand tone="plain" className="mt-8">
              <h2 className="text-lg font-bold text-muted-foreground">Browse by type</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setHazard("all")}
                  className={
                    hazard === "all" ? publicCategoryNavigationSelectedClass : publicCategoryNavigationClass
                  }
                >
                  All hazards
                </button>
                {hazardTypes.map((h) => (
                  <button
                    key={h.value}
                    onClick={() => setHazard(h.value)}
                    className={
                      hazard === h.value
                        ? publicCategoryNavigationSelectedClass
                        : publicCategoryNavigationClass
                    }
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </EditorialBand>

            <div id="all-alerts" className="mt-8 scroll-mt-24">
              <SectionHeader
                eyebrow="Published alert records"
                title="Alerts by Severity, County and Road"
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
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? <p className="mt-8 text-muted-foreground">Loading alerts…</p> : null}
            {!isLoading && visible.length === 0 ? (
              <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
                No alerts match this filter yet.
              </p>
            ) : null}

            <div className="mt-6">
              <IncidentEntityGroups
                items={visible as PublicIncidentCard[]}
                kind="alert"
                getEntity={(item) => item.hazard_type ?? "Other alerts"}
                renderActions={alertActions}
              />
            </div>
        </div>
      </div>

      <GlobalEditorialPreview destination="alerts" topic={hazard !== "all" ? hazard : null} />
      <EditorialDiscoveryRail exclude="alerts" />
      <TopContributingProfiles />
      <MjengoPreviews context="alerts" />
    </div>
  );
}

function TopContributingProfiles() {
  const [expanded, setExpanded] = useState(false);
  const { data: weekly = [], isLoading } = useProfileLeaderboard(7, expanded ? 20 : 5);
  const { data: names = {} } = useProfileNames(weekly.map((r) => r.id));
  const { data: usernames = {} } = useProfileUsernames(weekly.map((r) => r.id));

  if (!isLoading && weekly.length === 0) return null;

  return (
    <div className="mt-14 border-t border-border pt-10">
      <h2 className="flex items-center gap-2 text-[1.155rem] font-bold">
        <Trophy className="size-5 text-accent" /> Top contributors this week
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ranked by alerts, reports and comments posted in the last 7 days.
      </p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {weekly.map((r, i) => (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent-foreground">
              {i + 1}
            </span>
            <div className="min-w-0">
              <UserLink
                userId={r.id}
                name={names[r.id]}
                username={usernames[r.id]}
                className="truncate"
              />
              <p className="text-xs text-muted-foreground">{r.count} contributions</p>
            </div>
          </li>
        ))}
      </ol>
      {!expanded && weekly.length >= 5 ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 text-sm font-semibold text-brand-blue underline"
        >
          View more
        </button>
      ) : null}
    </div>
  );
}
