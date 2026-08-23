import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CarFront, MessageSquare, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate, timeAgo } from "@/lib/format";
import { SeverityBadge } from "@/components/site/severity-badge";
import { useRoleLabels, primaryRoleLabel } from "@/hooks/useRoles";

export const Route = createFileRoute("/u/$userId")({
  head: () => ({
    meta: [
      { title: "Contributor Profile — Share Barabara" },
      {
        name: "description",
        content:
          "Everything a Share Barabara contributor has published: hazard alerts, accident reports and discussion comments.",
      },
      { property: "og:title", content: "Contributor Profile — Share Barabara" },
      {
        property: "og:description",
        content: "Alerts, accident reports and comments contributed by this road user.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContributorPage,
});

function ContributorPage() {
  const { userId } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, county, created_at")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: roleMap = {} } = useRoleLabels([userId]);

  const { data: alerts = [] } = useQuery({
    queryKey: ["user-alerts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: submitted = [] } = useQuery({
    queryKey: ["user-reports", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: reviewed = [] } = useQuery({
    queryKey: ["user-reviewed", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("reviewed_by", userId)
        .order("reviewed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["user-comments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const name = profile?.display_name ?? "Road user";
  const role = primaryRoleLabel(roleMap[userId]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        {role}
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">{name}</h1>
      <p className="mt-2 text-muted-foreground">
        {profile?.county ? `${profile.county} · ` : ""}
        {profile?.created_at ? `Contributing since ${longDate(profile.created_at)}` : ""}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Alerts", value: alerts.length },
          { label: "Reports filed", value: submitted.length },
          { label: "Reports approved", value: reviewed.length },
          { label: "Comments", value: comments.length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-5 card-elevated">
            <p className="font-display text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <CarFront className="size-5 text-accent" /> Accident reports
        </h2>
        {submitted.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No reports published yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {submitted.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={r.severity} />
                  <Link to="/reports" className="font-semibold hover:underline">{r.title}</Link>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {longDate(r.occurred_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.county}{r.road ? ` · ${r.road}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {reviewed.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-bold">Reports approved and edited</h2>
          <ul className="mt-4 space-y-3">
            {reviewed.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <span className="font-semibold">{r.title}</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.county} · approved {r.reviewed_at ? timeAgo(r.reviewed_at) : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <TriangleAlert className="size-5 text-caution" /> Hazard alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No alerts posted yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={a.severity} />
                  <span className="font-semibold">{a.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.county}{a.road ? ` · ${a.road}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <MessageSquare className="size-5 text-accent" /> Comments
        </h2>
        {comments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-foreground/90">{c.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  on a {c.entity_type} · {timeAgo(c.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
