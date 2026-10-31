import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames, useProfileAvatars } from "@/lib/profiles";
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
import { UserAvatar } from "@/components/site/user-avatar";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";
import { ContentRequestActions } from "@/components/site/content-request-actions";
import { AttachmentGallery, type AttachmentRow } from "@/components/site/attachment-gallery";
import { ShareBarabaraAI } from "@/components/site/share-barabara-ai";
import { GlobalEditorialPreview } from "@/components/site/global-editorial-preview";
import { EditorialMediaMeta } from "@/components/site/editorial-media-meta";
import { EditorialSummary } from "@/components/site/editorial-summary";
import { RelatedContent } from "@/components/site/related-content";
import { EditorialUpdates } from "@/components/site/editorial-updates";
import { EditorialSidebar } from "@/components/site/editorial-sidebar";
import { PublicBreadcrumbStrip, SidebarModule } from "@/components/site/public-layout";
import { socialHead } from "@/lib/seo";
import { publicEditorialCategoryBadgeClass } from "@/components/site/public-ui";
import { recordPublicView } from "@/lib/view-tracking";
import { CompactEditorialList } from "@/components/site/compact-editorial-list";

export const Route = createFileRoute("/alerts/$alertId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("id", params.alertId)
      .or("status.is.null,status.in.(active,in_progress,resolved,under_resolution)")
      .maybeSingle();
    return data;
  },
  head: ({ loaderData }) =>
    socialHead({
      title: loaderData?.title || "Road Hazard Alert",
      description:
        loaderData?.description || "Read the full hazard alert and join the community discussion.",
      pathname: `/alerts/${loaderData?.id ?? ""}`,
        imageUrl: loaderData?.image_url ?? null,
    }),
  component: AlertDetail,
});

type RelatedAlert = {
  id: string;
  title: string;
  description: string;
  county: string;
  road: string | null;
  hazard_type: string;
  severity: string;
  image_url: string | null;
};

function AlertList({ alerts }: { alerts: RelatedAlert[] }) {
  return (
    <CompactEditorialList items={alerts.map((a) => ({
      id: a.id,
      title: a.title,
      imageUrl: a.image_url,
      href: `/alerts/${a.id}`,
      meta: [a.county, a.road].filter(Boolean).join(" · "),
    }))} />
  );
}

function AlertDetail() {
  const { alertId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { data: hazardTypes = [] } = useHazardTypes();

  const { data: alert, isLoading } = useQuery({
    queryKey: ["alert", alertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", alertId)
        .or("status.is.null,status.in.(active,in_progress,resolved,under_resolution)")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderData,
  });

  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!alert || recordedFor.current === alert.id) return;
    recordedFor.current = alert.id;
    void recordPublicView("alert_views", "alert_id", alert.id);
  }, [alert]);

  const people = alert ? [alert.user_id] : [];
  const { data: names = {} } = useProfileNames(people);
  const { data: avatars = {} } = useProfileAvatars(people);
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
        .select("id, title, description, county, road, hazard_type, severity, image_url")
        .eq("county", alert!.county)
        .in("status", ["active", "in_progress", "resolved"])
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
        .select("id, title, description, county, road, hazard_type, severity, image_url")
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
        <h1 className="text-[1.155rem] font-bold">Alert not found</h1>
        <Link to="/alerts" className="mt-4 inline-block underline">
          Back to alerts
        </Link>
      </div>
    );
  }

  const linkedRoad = roadMap[alert.road_id ?? ""];
  const alertMedia = alert as typeof alert & { image_alt?: string | null; image_caption?: string | null; image_credit?: string | null };
  const publicStatus = alert.status === "under_resolution" || alert.status === "in_progress"
    ? "In Progress"
    : alert.status === "active"
      ? "Active"
      : alert.status === "resolved"
        ? "Resolved"
        : null;
  const statusClass = alert.status === "active"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : alert.status === "resolved"
      ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
      : "border-caution/40 bg-caution/10 text-caution";

  return (
    <>
      <PublicBreadcrumbStrip
        items={[
          { label: "Home", to: "/" },
          { label: "Alerts", to: "/alerts" },
          { label: alert.title },
        ]}
      />
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-2 py-1.5 sm:gap-5 sm:px-6 sm:py-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:py-4">
        <article className="min-w-0 rounded-xl border border-border bg-card p-1.5 card-elevated sm:rounded-2xl sm:p-3">
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue">Alert / Hazard</span>
            {publicStatus ? <Link to="/alerts" search={{ status: alert.status === "under_resolution" ? "in_progress" : alert.status } as never} className={`rounded-full border px-2 py-0.5 text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${statusClass}`}>{publicStatus}</Link> : null}
            <TriangleAlert className="size-4 text-caution" />
            <Link to="/alerts" search={{ hazard: alert.hazard_type ?? undefined } as never} className="inline-flex items-center rounded border border-destructive/30 px-0.5 py-0.5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <SeverityBadge value={alert.severity} />
            </Link>
            <Link to="/alerts" search={{ hazard: alert.hazard_type ?? undefined } as never} className={publicEditorialCategoryBadgeClass}>
              {hazardTypes.find((h) => h.value === alert.hazard_type)?.label ?? alert.hazard_type}
            </Link>
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            <Link to="/alerts" search={{ county: alert.county } as never} className="underline underline-offset-2 hover:text-brand-blue">{alert.county}</Link>
            {alert.road ? <> {" · "}{linkedRoad ? <Link to="/roads/$slug" params={{ slug: linkedRoad.slug }} className="underline underline-offset-2 hover:text-brand-blue">{alert.road}</Link> : alert.road}</> : null}
          </p>

          <h1 className="mt-2 max-w-4xl text-[24.7px] font-bold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[34px] lg:text-[clamp(34px,2.5vw,42px)]">
            {alert.title}
          </h1>
          <div className="mt-2 text-sm text-muted-foreground"><span>{longDate(alert.created_at)}</span></div>
          <div className="mt-3">
            <ShareButtons title={alert.title} />
          </div>

          {alert.image_url ? (
            <figure className="mt-4">
              <img
                src={alert.image_url}
                alt={alertMedia.image_alt || alert.title}
                className="block h-auto max-w-full rounded-xl border border-border object-contain"
              />
              <EditorialMediaMeta {...(alertMedia.image_caption ? { caption: alertMedia.image_caption } : {})} {...(alertMedia.image_credit ? { credit: alertMedia.image_credit } : {})} />
            </figure>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            {!alert.is_anonymous ? <UserAvatar url={avatars[alert.user_id]} name={names[alert.user_id]} className="size-9" /> : null}
            <p className="text-sm text-muted-foreground">
              By{" "}
              <UserLink
                userId={alert.user_id}
                name={names[alert.user_id]}
                anonymous={alert.is_anonymous}
                verified={alert.page_id ? !!pages[alert.page_id]?.verified : !!verified[alert.user_id]}
                pageSlug={alert.page_id ? pages[alert.page_id]?.slug : undefined}
                pageName={alert.page_id ? pages[alert.page_id]?.name : undefined}
              />
            </p>
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

          {(alert as typeof alert & { summary?: string | null }).summary ? <div className="mt-5 rounded-lg border-l-4 border-brand-blue bg-muted/30 px-4 py-3 text-base leading-7 text-foreground/90 sm:px-5 sm:py-4"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-blue">Alert summary</p>{renderRichText((alert as typeof alert & { summary?: string | null }).summary!)}</div> : null}
          <div className="mt-5"><EditorialSummary>{renderRichText(alert.description)}</EditorialSummary></div>

          <AttachmentGallery attachments={alert.attachments as AttachmentRow[]} />

          <EditorialUpdates parentType="alert" parentId={alert.id} />

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
            <BannerAd placement="alert-primary-content" />
          </div>
          {alert.status === "active" ? (
            <ShareBarabaraAI
              contextType="alert"
              contextId={alert.id}
              title={alert.title}
              sourceText={`${alert.title}\n${alert.description ?? ""}\nCounty: ${alert.county}\nRoad: ${alert.road ?? ""}\nHazard: ${alert.hazard_type}\nSeverity: ${alert.severity}\nStatus: ${alert.status}`}
            />
          ) : null}
          <CommentSection entityType="alert" entityId={alert.id} />
        </article>

        <EditorialSidebar adPlacement="alert-sidebar">
          {related.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                More from {alert.county}
              </h2>
              <AlertList alerts={related.slice(0, 3)} />
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
              <AlertList alerts={latest.slice(0, 3)} />
              <Link
                to="/alerts"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
        </EditorialSidebar>
      </div>
      <RelatedContent contentType="alert" contentId={alert.id} />
      <GlobalEditorialPreview
        destination="alerts"
        excludeId={alert.id}
        topic={alert.hazard_type}
        excludeKeys={[
          ...related.slice(0, 3).map((item) => `alerts:${item.id}`),
          ...latest.slice(0, 3).map((item) => `alerts:${item.id}`),
        ]}
      />
    </>
  );
}
