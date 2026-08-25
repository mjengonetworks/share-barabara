import { Fragment, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, TriangleAlert } from "lucide-react";
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
import { useProfileNames } from "@/lib/profiles";
import { useVotes } from "@/hooks/useVotes";
import { useRoadsByIds } from "@/hooks/useRoadsByIds";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { timeAgo } from "@/lib/format";
import { HAZARD_TYPES, KENYA_COUNTIES } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";
import { VoteButtons } from "@/components/site/vote-buttons";
import { UserLink } from "@/components/site/user-link";
import { AlertForm } from "@/components/site/alert-form";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";

export const Route = createFileRoute("/alerts")({
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

function AlertsPage() {
  const { user } = useAuth();
  const [county, setCounty] = useState("all");
  const [hazard, setHazard] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

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

  const visible = alerts.filter(
    (a) =>
      (county === "all" || a.county === county) && (hazard === "all" || a.hazard_type === hazard),
  );
  const latest = alerts.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Live feed
          </p>
          <h1 className="mt-2 text-4xl font-extrabold">Road hazard alerts</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Hazards reported by road users across the 47 counties. Check before you travel, and add
            what you see on your route.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {latest.length > 0 ? (
            <div>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Latest alerts</h2>
                <a
                  href="#all-alerts"
                  className="text-sm font-semibold text-accent-foreground underline"
                >
                  See all
                </a>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-3">
                {latest.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-border bg-card p-4 card-elevated"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge value={a.severity} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {timeAgo(a.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold">{a.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {a.county}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-12">
            <h2 className="text-lg font-bold text-muted-foreground">Browse by type</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setHazard("all")}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  hazard === "all"
                    ? "border-accent bg-accent/15 text-accent-foreground"
                    : "border-border bg-card hover:border-accent hover:text-accent-foreground"
                }`}
              >
                All hazards
              </button>
              {HAZARD_TYPES.map((h) => (
                <button
                  key={h.value}
                  onClick={() => setHazard(h.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    hazard === h.value
                      ? "border-accent bg-accent/15 text-accent-foreground"
                      : "border-border bg-card hover:border-accent hover:text-accent-foreground"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div id="all-alerts" className="mt-12 scroll-mt-24">
            <h2 className="text-2xl font-bold">All alerts</h2>
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
          </div>

          {isLoading ? <p className="mt-8 text-muted-foreground">Loading alerts…</p> : null}
          {!isLoading && visible.length === 0 ? (
            <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
              No alerts match this filter yet.
            </p>
          ) : null}

          <ul className="mt-6 space-y-4">
            {visible.map((a, i) => (
              <Fragment key={a.id}>
                {i === 2 ? (
                  <li key="ad">
                    <BannerAd />
                  </li>
                ) : null}
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-card p-5 card-elevated"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <TriangleAlert className="size-4 text-caution" />
                    <SeverityBadge value={a.severity} />
                    <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {HAZARD_TYPES.find((h) => h.value === a.hazard_type)?.label ?? a.hazard_type}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold">{a.title}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4" /> {a.county}
                    {a.road ? (
                      <>
                        {" · "}
                        {(() => {
                          const linked = roadMap[a.road_id ?? ""];
                          return linked ? (
                            <Link
                              to="/roads/$slug"
                              params={{ slug: linked.slug }}
                              className="underline"
                            >
                              {a.road}
                            </Link>
                          ) : (
                            a.road
                          );
                        })()}
                      </>
                    ) : null}
                    {" · by "}
                    <UserLink
                      userId={a.user_id}
                      name={names[a.user_id]}
                      anonymous={a.is_anonymous}
                      verified={a.page_id ? !!pages[a.page_id]?.verified : !!verified[a.user_id]}
                      pageSlug={a.page_id ? pages[a.page_id]?.slug : undefined}
                      pageName={a.page_id ? pages[a.page_id]?.name : undefined}
                    />
                  </p>
                  <p className="mt-3 text-sm text-foreground/90">{a.description}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <VoteButtons
                      net={scores[a.id]?.net ?? 0}
                      mine={scores[a.id]?.mine ?? 0}
                      onVote={(v) => vote(a.id, v)}
                    />
                    <button
                      className="text-sm font-semibold text-accent-foreground underline"
                      onClick={() => setOpenId(openId === a.id ? null : a.id)}
                    >
                      {openId === a.id ? "Hide discussion" : "Discussion"}
                    </button>
                  </div>
                  {openId === a.id ? <CommentSection entityType="alert" entityId={a.id} /> : null}
                </li>
              </Fragment>
            ))}
          </ul>
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-6 card-elevated lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Report a hazard</h2>
          {user ? (
            <div className="mt-4">
              <AlertForm />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to publish an alert. Never use your phone while driving: stop safely first,
                or ask a passenger to report.
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
