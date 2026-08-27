import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames } from "@/lib/profiles";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { useRoadsByIds } from "@/hooks/useRoadsByIds";
import { useVotes } from "@/hooks/useVotes";
import { longDate } from "@/lib/format";
import { PARTIES_INVOLVED } from "@/lib/constants";
import { useHazardTypes } from "@/hooks/useTaxonomy";
import { renderRichText } from "@/lib/richtext";
import { SeverityBadge } from "@/components/site/severity-badge";
import { VoteButtons } from "@/components/site/vote-buttons";
import { UserLink } from "@/components/site/user-link";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";
import { ContentRequestActions } from "@/components/site/content-request-actions";
import { AttachmentGallery, type AttachmentRow } from "@/components/site/attachment-gallery";

export const Route = createFileRoute("/alerts/$alertId")({
  head: () => ({
    meta: [
      { title: "Road Hazard Alert: Share Barabara" },
      {
        name: "description",
        content: "Read the full hazard alert and join the community discussion.",
      },
    ],
  }),
  component: AlertDetail,
});

type RelatedAlert = { id: string; title: string; severity: string; county: string };

function AlertList({ alerts }: { alerts: RelatedAlert[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {alerts.map((a) => (
        <li key={a.id}>
          <Link
            to="/alerts/$alertId"
            params={{ alertId: a.id }}
            className="text-sm text-brand-blue hover:underline"
          >
            {a.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AlertDetail() {
  const { alertId } = Route.useParams();
  const { data: hazardTypes = [] } = useHazardTypes();

  const { data: alert, isLoading } = useQuery({
    queryKey: ["alert", alertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", alertId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!alert || recordedFor.current === alert.id) return;
    recordedFor.current = alert.id;
    void supabase.from("alert_views").insert({ alert_id: alert.id }).then();
  }, [alert]);

  const people = alert ? [alert.user_id] : [];
  const { data: names = {} } = useProfileNames(people);
  const { data: verified = {} } = useSubscriptionStatuses(people);
  const { data: pages = {} } = usePagesByIds(alert ? [alert.page_id] : []);
  const { data: roadMap = {} } = useRoadsByIds(alert ? [alert.road_id] : []);
  const { scores, vote } = useVotes("alert", alert ? [alert.id] : []);

  const { data: related = [] } = useQuery({
    queryKey: ["alerts-related", alert?.id, alert?.county],
    enabled: !!alert,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, severity, county")
        .eq("county", alert!.county)
        .neq("id", alert!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: latest = [] } = useQuery({
    queryKey: ["alerts-latest-sidebar", alert?.id],
    enabled: !!alert,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, severity, county")
        .neq("id", alert!.id)
        .order("created_at", { ascending: false })
        .limit(5 + related.length);
      if (error) throw error;
      const relatedIds = new Set(related.map((r) => r.id));
      return data.filter((a) => !relatedIds.has(a.id)).slice(0, 5);
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading alert…</p>;
  }

  if (!alert) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-[1.05rem] font-bold">Alert not found</h1>
        <Link to="/alerts" className="mt-4 inline-block underline">
          Back to alerts
        </Link>
      </div>
    );
  }

  const linkedRoad = roadMap[alert.road_id ?? ""];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> All alerts
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <TriangleAlert className="size-4 text-caution" />
            <SeverityBadge value={alert.severity} />
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {hazardTypes.find((h) => h.value === alert.hazard_type)?.label ?? alert.hazard_type}
            </span>
            <span className="text-sm text-muted-foreground">{longDate(alert.created_at)}</span>
          </div>

          <h1 className="mt-3 text-[1.575rem] font-extrabold leading-tight">{alert.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {alert.county}
            {alert.road ? (
              <>
                {" · "}
                {linkedRoad ? (
                  <Link to="/roads/$slug" params={{ slug: linkedRoad.slug }} className="underline">
                    {alert.road}
                  </Link>
                ) : (
                  alert.road
                )}
              </>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Reported by{" "}
            <UserLink
              userId={alert.user_id}
              name={names[alert.user_id]}
              anonymous={alert.is_anonymous}
              verified={
                alert.page_id ? !!pages[alert.page_id]?.verified : !!verified[alert.user_id]
              }
              pageSlug={alert.page_id ? pages[alert.page_id]?.slug : undefined}
              pageName={alert.page_id ? pages[alert.page_id]?.name : undefined}
            />
          </p>

          <div className="mt-3">
            <ShareButtons title={alert.title} />
          </div>

          {alert.parties_involved.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {alert.parties_involved.map((p) => (
                <span key={p} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {PARTIES_INVOLVED.find((x) => x.value === p)?.label ?? p}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-6 space-y-4 text-foreground/90">
            {renderRichText(alert.description)}
          </div>

          <AttachmentGallery attachments={alert.attachments as AttachmentRow[]} />

          <div className="mt-6">
            <VoteButtons
              net={scores[alert.id]?.net ?? 0}
              mine={scores[alert.id]?.mine ?? 0}
              onVote={(v) => vote(alert.id, v)}
            />
          </div>

          <ContentRequestActions
            entityType="alert"
            entityId={alert.id}
            ownerId={alert.user_id}
            parties={alert.parties_involved}
          />

          <div className="mt-8">
            <BannerAd />
          </div>
          <CommentSection entityType="alert" entityId={alert.id} />
        </article>

        <aside className="space-y-8">
          {related.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                More from {alert.county}
              </h2>
              <AlertList alerts={related} />
              <Link
                to="/alerts"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
          {latest.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Latest alerts
              </h2>
              <AlertList alerts={latest} />
              <Link
                to="/alerts"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
