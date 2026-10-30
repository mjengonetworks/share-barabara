import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames, useProfileAvatars } from "@/lib/profiles";
import { useRoleLabels, roleRank, ROLE_RANK } from "@/hooks/useRoles";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { useRoadsByIds } from "@/hooks/useRoadsByIds";
import { useVotes } from "@/hooks/useVotes";
import { longDate } from "@/lib/format";
import { PARTIES_INVOLVED } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";
import { VoteButtons } from "@/components/site/vote-buttons";
import { UserLink } from "@/components/site/user-link";
import { UserAvatar } from "@/components/site/user-avatar";
import { AttachmentGallery, type AttachmentRow } from "@/components/site/attachment-gallery";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";
import { ContentRequestActions } from "@/components/site/content-request-actions";
import { ShareBarabaraAI } from "@/components/site/share-barabara-ai";
import { GlobalEditorialPreview } from "@/components/site/global-editorial-preview";
import { EditorialMediaMeta } from "@/components/site/editorial-media-meta";
import { EditorialSummary } from "@/components/site/editorial-summary";
import { EditorialUpdates } from "@/components/site/editorial-updates";
import { AdRichText } from "@/components/site/ad-interleave";
import { EditorialSidebar } from "@/components/site/editorial-sidebar";
import { PublicBreadcrumbStrip } from "@/components/site/public-layout";
import { RelatedContent } from "@/components/site/related-content";
import { socialHead } from "@/lib/seo";
import { publicEditorialCategoryBadgeClass } from "@/components/site/public-ui";
import { recordPublicView } from "@/lib/view-tracking";
import { fatalityLabel } from "@/lib/report-metrics";
import { CompactEditorialList } from "@/components/site/compact-editorial-list";

export const Route = createFileRoute("/reports/$reportId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("accident_reports")
      .select("*")
      .eq("id", params.reportId)
      .eq("status", "approved")
      .maybeSingle();
    return data;
  },
  head: ({ loaderData }) => {
    const title = loaderData?.seo_title || loaderData?.title || "Accident Report";
    const description =
      loaderData?.seo_description ||
      "Read the full accident report and join the community discussion.";
    const head = socialHead({
      title,
      description,
      pathname: `/reports/${loaderData?.id ?? ""}`,
      imageUrl: loaderData?.image_url ?? null,
    });
    return {
      ...head,
      meta: [
        ...head.meta,
        ...(loaderData?.seo_keywords
          ? [{ name: "keywords", content: loaderData.seo_keywords }]
          : []),
      ],
    };
  },
  component: ReportDetail,
});

type RelatedReport = {
  id: string;
  title: string;
  description: string;
  severity: string;
  county: string;
  road: string | null;
  image_url: string | null;
  casualties: number | null;
  fatalities: number | null;
};

function highlightCount(value: number | null | undefined, label: string) {
  return { value: value == null ? "0" : String(value), label: value == null ? `${label} · count unavailable` : label };
}

function ReportList({ reports }: { reports: RelatedReport[] }) {
  return (
    <CompactEditorialList items={reports.map((r) => ({
      id: r.id,
      title: r.title,
      imageUrl: r.image_url,
      href: `/reports/${r.id}`,
      meta: [r.county, r.road].filter(Boolean).join(" · "),
    }))} />
  );
}

function ReportDetail() {
  const { reportId } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("id", reportId)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderData,
  });

  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!report || recordedFor.current === report.id) return;
    recordedFor.current = report.id;
    void recordPublicView("accident_report_views", "report_id", report.id);
  }, [report]);

  const people = report ? ([report.user_id, report.reviewed_by].filter(Boolean) as string[]) : [];
  const { data: names = {} } = useProfileNames(people);
  const { data: avatars = {} } = useProfileAvatars(people);
  const { data: verified = {} } = useSubscriptionStatuses(people);
  const { data: pages = {} } = usePagesByIds(report ? [report.page_id] : []);
  const { data: roleMap = {} } = useRoleLabels(people);
  const { data: roadMap = {} } = useRoadsByIds(report ? [report.road_id] : []);
  const { scores, vote } = useVotes("report", report ? [report.id] : []);

  const { data: related = [] } = useQuery({
    queryKey: ["reports-related", report?.id, report?.county],
    enabled: !!report,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("id, title, description, severity, county, road, image_url, casualties, fatalities")
        .eq("status", "approved")
        .eq("county", report!.county)
        .neq("id", report!.id)
        .order("occurred_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: latest = [] } = useQuery({
    queryKey: ["reports-latest-sidebar", report?.id],
    enabled: !!report,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("id, title, description, severity, county, road, image_url, casualties, fatalities")
        .eq("status", "approved")
        .neq("id", report!.id)
        .order("occurred_at", { ascending: false })
        .limit(5 + related.length);
      if (error) throw error;
      const relatedIds = new Set(related.map((r) => r.id));
      return data.filter((r) => !relatedIds.has(r.id)).slice(0, 5);
    },
  });

  const { data: trending = [] } = useQuery({
    queryKey: ["reports-trending-sidebar", report?.id],
    enabled: !!report,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_reports", {
        hours_back: 48,
        result_limit: 6,
      });
      if (error) throw error;
      return (data ?? []).filter((r) => r.id !== report!.id).slice(0, 5);
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading report…</p>;
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-[1.155rem] font-bold">Report not found</h1>
        <Link to="/reports" className="mt-4 inline-block underline">
          Back to reports
        </Link>
      </div>
    );
  }

  const linkedRoad = roadMap[report.road_id ?? ""];
  const reportIncidentType = (report as typeof report & { incident_type?: string | null }).incident_type;
  const publicationDate = report.created_at;

  return (
    <>
      <PublicBreadcrumbStrip
        items={[
          { label: "Home", to: "/" },
          { label: "Accident Reports", to: "/reports" },
          { label: report.title },
        ]}
      />
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-2 py-1.5 sm:gap-5 sm:px-6 sm:py-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:py-4">
        <article className="min-w-0 rounded-xl border border-border bg-card p-1.5 card-elevated sm:rounded-2xl sm:p-3">
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue">Accident Report</span>
            <Link
              to="/reports"
              search={{ incident: reportIncidentType ?? undefined } as never}
              className={publicEditorialCategoryBadgeClass}
            >
              {reportIncidentType || "Accident report"}
            </Link>
            <Link
              to="/reports"
              search={{ severity: report.severity ?? undefined } as never}
              className="inline-flex items-center rounded border border-destructive/30 px-0.5 py-0.5 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SeverityBadge value={report.severity} />
            </Link>
            {report.status !== "approved" ? (
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                  report.status === "rejected"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-caution/20 text-caution"
                }`}
              >
                {report.status === "pending" ? "awaiting review" : report.status}
              </span>
            ) : null}
          </div>
          {report.status === "rejected" && report.rejection_reason ? (
            <p className="mt-3 rounded border-l-4 border-destructive bg-destructive/10 p-4 text-sm">
              <span className="font-semibold">Rejection reason: </span>
              {report.rejection_reason}
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            <Link to="/reports" search={{ county: report.county } as never} className="underline underline-offset-2 hover:text-brand-blue">
              {report.county}
            </Link>
            {report.road ? <> {" · "}{linkedRoad ? <Link to="/roads/$slug" params={{ slug: linkedRoad.slug }} className="underline underline-offset-2 hover:text-brand-blue">{report.road}</Link> : report.road}</> : null}
          </p>
          <h1 className="mt-2 max-w-4xl text-[24.7px] font-bold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[34px] lg:text-[clamp(34px,2.5vw,42px)]">
            {report.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{longDate(publicationDate)}</p>
          <div className="mt-3">
            <ShareButtons title={report.title} />
          </div>
          {report.image_url ? (
            <figure className="mt-4">
              <img
                src={report.image_url}
                alt={report.image_alt || report.title}
                className="block h-auto max-w-full rounded-xl border border-border object-contain"
              />
              <EditorialMediaMeta caption={report.image_caption} credit={report.image_credit} />
            </figure>
          ) : null}
          <div className="mt-2 flex items-center gap-3">
            {!report.is_anonymous ? (
              <UserAvatar
                url={avatars[report.user_id]}
                name={names[report.user_id]}
                className="size-10"
              />
            ) : null}
            <div>
              <p className="text-sm text-muted-foreground">
                By{" "}
                <UserLink
                  userId={report.user_id}
                  name={names[report.user_id]}
                  anonymous={report.is_anonymous}
                  verified={
                    report.page_id ? !!pages[report.page_id]?.verified : !!verified[report.user_id]
                  }
                  staff={roleRank(roleMap[report.user_id] ?? []) >= ROLE_RANK.moderator}
                  pageSlug={report.page_id ? pages[report.page_id]?.slug : undefined}
                  pageName={report.page_id ? pages[report.page_id]?.name : undefined}
                />
                {report.reviewed_by ? (
                  <>
                    {" · verified & edited by "}
                    <UserLink
                      userId={report.reviewed_by}
                      name={names[report.reviewed_by]}
                      verified={!!verified[report.reviewed_by]}
                      staff={roleRank(roleMap[report.reviewed_by] ?? []) >= ROLE_RANK.moderator}
                    />
                  </>
                ) : null}
              </p>
            </div>
          </div>

          {report.occurred_at ? <p className="mt-2 text-sm text-muted-foreground">Accident date: {longDate(report.occurred_at)}</p> : null}

          <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
            {(() => { const vehicles = highlightCount(report.vehicles_involved, "Vehicles involved"); const injured = highlightCount(report.casualties, "Injured"); const fatalities = highlightCount(report.fatalities, fatalityLabel(report.fatalities)); return <>
            <div className="rounded-lg border border-border bg-card p-4 text-center card-elevated">
              <p className="font-display text-2xl font-extrabold" aria-label={vehicles.label}>{vehicles.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{vehicles.label}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center card-elevated">
              <p className="font-display text-2xl font-extrabold text-caution" aria-label={injured.label}>{injured.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{injured.label}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center card-elevated">
              <p className="font-display text-2xl font-extrabold text-destructive" aria-label={fatalities.label}>{fatalities.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{fatalities.label}</p>
            </div>
            </>; })()}
          </div>
          {report.status === "approved" ? (
            <ShareBarabaraAI
              contextType="report"
              contextId={report.id}
              title={report.title}
              sourceText={`${report.title}\n${report.description ?? ""}\nCounty: ${report.county}\nRoad: ${report.road ?? ""}\nOccurred: ${report.occurred_at ?? ""}\nVehicles involved: ${report.vehicles_involved ?? "Not confirmed"}\nCasualties: ${report.casualties ?? "Not confirmed"}\nFatalities: ${report.fatalities ?? "Not confirmed"}\nSeverity: ${report.severity}`}
            />
          ) : null}

          {report.parties_involved.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.parties_involved.map((p) => (
                <span key={p} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {PARTIES_INVOLVED.find((x) => x.value === p)?.label ?? p}
                </span>
              ))}
            </div>
          ) : null}

          {(report as typeof report & { summary?: string | null }).summary ? <EditorialSummary className="mt-5"><AdRichText content={(report as typeof report & { summary?: string | null }).summary!} placement="report-summary" /></EditorialSummary> : null}
          <div className="mt-5 space-y-4 bg-white text-foreground/90">
            <AdRichText content={report.description} placement="report-body" />
          </div>

          <AttachmentGallery attachments={report.attachments as AttachmentRow[]} />

          <EditorialUpdates parentType="report" parentId={report.id} />

          {report.editor_note ? (
            <p className="mt-6 rounded border-l-4 border-accent bg-muted/50 p-4 text-sm">
              <span className="font-semibold">Editor's note: </span>
              {report.editor_note}
            </p>
          ) : null}

          <ContentRequestActions
            entityType="report"
            entityId={report.id}
            ownerId={report.user_id}
            parties={report.parties_involved}
          />

          <div className="mt-8">
            <BannerAd placement="report-primary-content" />
          </div>

          <div className="mt-6">
            <VoteButtons
              size="md"
              net={scores[report.id]?.net ?? 0}
              mine={scores[report.id]?.mine ?? 0}
              onVote={(v) => vote(report.id, v)}
            />
          </div>

          <CommentSection entityType="report" entityId={report.id} />
        </article>

        <EditorialSidebar adPlacement="report-sidebar">
          {related.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                More from {report.county}
              </h2>
              <ReportList reports={related.slice(0, 3)} />
              <Link
                to="/reports"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
          {latest.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Latest reports
              </h2>
              <ReportList reports={latest.slice(0, 3)} />
              <Link
                to="/reports"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
          {trending.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <Flame className="size-4 text-destructive" /> Trending
              </h2>
              <ReportList reports={trending.slice(0, 3)} />
              <Link
                to="/reports"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
        </EditorialSidebar>
      </div>
      <RelatedContent contentType="report" contentId={report.id} />
      <GlobalEditorialPreview
        destination="reports"
        excludeId={report.id}
        topic={reportIncidentType ?? null}
        excludeKeys={[
          ...related.slice(0, 3).map((item) => `reports:${item.id}`),
          ...latest.slice(0, 3).map((item) => `reports:${item.id}`),
          ...trending.slice(0, 3).map((item) => `reports:${item.id}`),
        ]}
      />
    </>
  );
}
