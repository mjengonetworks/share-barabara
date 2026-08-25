import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames } from "@/lib/profiles";
import { useRoleLabels, primaryRoleLabel } from "@/hooks/useRoles";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { useRoadsByIds } from "@/hooks/useRoadsByIds";
import { longDate } from "@/lib/format";
import { PARTIES_INVOLVED } from "@/lib/constants";
import { SeverityBadge } from "@/components/site/severity-badge";
import { UserLink } from "@/components/site/user-link";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";
import { ContentRequestActions } from "@/components/site/content-request-actions";

export const Route = createFileRoute("/reports/$reportId")({
  head: () => ({
    meta: [
      { title: "Accident Report: Share Barabara" },
      {
        name: "description",
        content: "Read the full accident report and join the community discussion.",
      },
    ],
  }),
  component: ReportDetail,
});

type RelatedReport = { id: string; title: string; severity: string; county: string };

function ReportList({ reports }: { reports: RelatedReport[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {reports.map((r) => (
        <li key={r.id}>
          <Link
            to="/reports/$reportId"
            params={{ reportId: r.id }}
            className="text-sm text-brand-blue hover:underline"
          >
            {r.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ReportDetail() {
  const { reportId } = Route.useParams();

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const people = report ? ([report.user_id, report.reviewed_by].filter(Boolean) as string[]) : [];
  const { data: names = {} } = useProfileNames(people);
  const { data: verified = {} } = useSubscriptionStatuses(people);
  const { data: pages = {} } = usePagesByIds(report ? [report.page_id] : []);
  const { data: roleMap = {} } = useRoleLabels(people);
  const { data: roadMap = {} } = useRoadsByIds(report ? [report.road_id] : []);

  const { data: related = [] } = useQuery({
    queryKey: ["reports-related", report?.id, report?.county],
    enabled: !!report,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("id, title, severity, county")
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
        .select("id, title, severity, county")
        .eq("status", "approved")
        .neq("id", report!.id)
        .order("occurred_at", { ascending: false })
        .limit(5 + related.length);
      if (error) throw error;
      const relatedIds = new Set(related.map((r) => r.id));
      return data.filter((r) => !relatedIds.has(r.id)).slice(0, 5);
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading report…</p>;
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-2xl font-bold">Report not found</h1>
        <Link to="/reports" className="mt-4 inline-block underline">
          Back to reports
        </Link>
      </div>
    );
  }

  const linkedRoad = roadMap[report.road_id ?? ""];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          <Link
            to="/reports"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> All reports
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <SeverityBadge value={report.severity} />
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
            <span className="text-sm text-muted-foreground">{longDate(report.occurred_at)}</span>
          </div>
          {report.status === "rejected" && report.rejection_reason ? (
            <p className="mt-3 rounded border-l-4 border-destructive bg-destructive/10 p-4 text-sm">
              <span className="font-semibold">Rejection reason: </span>
              {report.rejection_reason}
            </p>
          ) : null}
          <h1 className="mt-3 text-4xl font-extrabold leading-tight">{report.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {report.county}
            {report.road ? (
              <>
                {" · "}
                {linkedRoad ? (
                  <Link to="/roads/$slug" params={{ slug: linkedRoad.slug }} className="underline">
                    {report.road}
                  </Link>
                ) : (
                  report.road
                )}
              </>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Reported by{" "}
            <UserLink
              userId={report.user_id}
              name={names[report.user_id]}
              anonymous={report.is_anonymous}
              verified={
                report.page_id ? !!pages[report.page_id]?.verified : !!verified[report.user_id]
              }
              pageSlug={report.page_id ? pages[report.page_id]?.slug : undefined}
              pageName={report.page_id ? pages[report.page_id]?.name : undefined}
            />
            {!report.is_anonymous ? (
              <span className="ml-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                {primaryRoleLabel(roleMap[report.user_id])}
              </span>
            ) : null}
            {report.reviewed_by ? (
              <>
                {" · verified & edited by "}
                <UserLink
                  userId={report.reviewed_by}
                  name={names[report.reviewed_by]}
                  verified={!!verified[report.reviewed_by]}
                />
                <span className="ml-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                  <ShieldCheck className="size-3 text-accent" />
                  {primaryRoleLabel(roleMap[report.reviewed_by])}
                </span>
              </>
            ) : null}
          </p>

          <div className="mt-3">
            <ShareButtons title={report.title} />
          </div>

          {report.image_url ? (
            <img
              src={report.image_url}
              alt={report.title}
              className="mt-6 aspect-video w-full rounded-lg border border-border object-cover"
            />
          ) : null}

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 text-center card-elevated">
              <p className="font-display text-2xl font-extrabold">{report.vehicles_involved}</p>
              <p className="mt-1 text-xs text-muted-foreground">Vehicles involved</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center card-elevated">
              <p className="font-display text-2xl font-extrabold text-caution">
                {report.casualties}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Injured</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-center card-elevated">
              <p className="font-display text-2xl font-extrabold text-destructive">
                {report.fatalities}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Deaths</p>
            </div>
          </div>

          {report.parties_involved.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.parties_involved.map((p) => (
                <span key={p} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {PARTIES_INVOLVED.find((x) => x.value === p)?.label ?? p}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-6 space-y-4 text-foreground/90">
            {report.description.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

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
          />

          <div className="mt-8">
            <BannerAd />
          </div>
          <CommentSection entityType="report" entityId={report.id} />
        </article>

        <aside className="space-y-8">
          {related.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                More from {report.county}
              </h2>
              <ReportList reports={related} />
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
              <ReportList reports={latest} />
              <Link
                to="/reports"
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
