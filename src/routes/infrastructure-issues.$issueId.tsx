import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Construction, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames } from "@/lib/profiles";
import { longDate } from "@/lib/format";
import { renderRichText } from "@/lib/richtext";
import { ROAD_AUTHORITIES, STRUCTURE_TYPES } from "@/lib/constants";
import { UserLink } from "@/components/site/user-link";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";

export const Route = createFileRoute("/infrastructure-issues/$issueId")({
  head: () => ({
    meta: [
      { title: "Infrastructure Issue: Share Barabara" },
      {
        name: "description",
        content: "Read the full infrastructure issue report and see related issues nearby.",
      },
    ],
  }),
  component: IssueDetail,
});

type RelatedIssue = { id: string; title: string; road_name: string; county: string | null };

function IssueList({ issues }: { issues: RelatedIssue[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {issues.map((i) => (
        <li key={i.id}>
          <Link
            to="/infrastructure-issues/$issueId"
            params={{ issueId: i.id }}
            className="text-sm text-brand-blue hover:underline"
          >
            {i.title}
          </Link>
          <p className="text-xs text-muted-foreground">{i.road_name}</p>
        </li>
      ))}
    </ul>
  );
}

function IssueDetail() {
  const { issueId } = Route.useParams();

  const { data: issue, isLoading } = useQuery({
    queryKey: ["infrastructure-issue", issueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_issues")
        .select("*")
        .eq("id", issueId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(issue ? [issue.user_id] : []);

  const { data: byCounty = [] } = useQuery({
    queryKey: ["infra-related-county", issue?.id, issue?.county],
    enabled: !!issue?.county,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_issues")
        .select("id, title, road_name, county")
        .eq("status", "approved")
        .eq("county", issue!.county as string)
        .neq("id", issue!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: byAuthority = [] } = useQuery({
    queryKey: ["infra-related-authority", issue?.id, issue?.authority],
    enabled: !!issue?.authority,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_issues")
        .select("id, title, road_name, county")
        .eq("status", "approved")
        .eq("authority", issue!.authority as string)
        .neq("id", issue!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: byStructure = [] } = useQuery({
    queryKey: ["infra-related-structure", issue?.id, issue?.structure_type],
    enabled: !!issue,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("infrastructure_issues")
        .select("id, title, road_name, county")
        .eq("status", "approved")
        .eq("structure_type", issue!.structure_type)
        .neq("id", issue!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading issue…</p>;
  }

  if (!issue) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-2xl font-bold">Issue not found</h1>
        <Link to="/infrastructure-issues" className="mt-4 inline-block underline">
          Back to infrastructure issues
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          <Link
            to="/infrastructure-issues"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> All infrastructure issues
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 rounded bg-accent/20 px-2 py-0.5 font-semibold uppercase tracking-wide text-accent-foreground">
              <Construction className="size-3.5" />
              {STRUCTURE_TYPES.find((s) => s.value === issue.structure_type)?.label ??
                issue.structure_type}
            </span>
            {issue.authority ? (
              <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">
                {ROAD_AUTHORITIES.find((a) => a.value === issue.authority)?.label ??
                  issue.authority}
              </span>
            ) : null}
            <span className="capitalize text-muted-foreground">{issue.road_scope} road</span>
            <span className="ml-auto text-muted-foreground">{longDate(issue.created_at)}</span>
          </div>

          <h1 className="mt-3 text-4xl font-extrabold leading-tight">{issue.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4" /> {issue.road_name}
            {issue.county ? ` · ${issue.county}` : ""}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Reported by{" "}
            <UserLink
              userId={issue.user_id}
              name={names[issue.user_id]}
              anonymous={issue.is_anonymous}
            />
          </p>

          <div className="mt-3">
            <ShareButtons title={issue.title} />
          </div>

          {issue.image_url ? (
            <img
              src={issue.image_url}
              alt={issue.title}
              className="mt-6 aspect-video w-full rounded-lg border border-border object-cover"
            />
          ) : null}

          <p className="mt-6 border-l-4 border-accent pl-4 text-lg text-foreground/90">
            {issue.summary}
          </p>
          <div className="mt-6 space-y-4 text-foreground/90">{renderRichText(issue.content)}</div>

          {issue.editor_note ? (
            <p className="mt-6 rounded border-l-4 border-accent bg-muted/50 p-4 text-sm">
              <span className="font-semibold">Moderator's note: </span>
              {issue.editor_note}
            </p>
          ) : null}

          <div className="mt-8">
            <BannerAd />
          </div>
        </article>

        <aside className="space-y-8">
          {byCounty.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                More in {issue.county}
              </h2>
              <IssueList issues={byCounty} />
            </div>
          ) : null}
          {byAuthority.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                More reported to{" "}
                {ROAD_AUTHORITIES.find((a) => a.value === issue.authority)?.label ??
                  issue.authority}
              </h2>
              <IssueList issues={byAuthority} />
            </div>
          ) : null}
          {byStructure.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                More{" "}
                {(
                  STRUCTURE_TYPES.find((s) => s.value === issue.structure_type)?.label ??
                  issue.structure_type
                ).toLowerCase()}{" "}
                issues
              </h2>
              <IssueList issues={byStructure} />
            </div>
          ) : null}
          <Link
            to="/infrastructure-issues"
            className="inline-block text-sm font-semibold text-brand-blue underline"
          >
            Browse all issues
          </Link>
        </aside>
      </div>
    </div>
  );
}
