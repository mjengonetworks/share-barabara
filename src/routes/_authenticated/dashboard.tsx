import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { timeAgo, longDate } from "@/lib/format";
import { SeverityBadge } from "@/components/site/severity-badge";
import { Button } from "@/components/ui/button";
import { PageForm } from "@/components/site/page-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard: Share Barabara" },
      {
        name: "description",
        content:
          "Your submitted road hazard alerts, accident reports and comments on Share Barabara.",
      },
      { property: "og:title", content: "My Dashboard: Share Barabara" },
      {
        property: "og:description",
        content: "Track the alerts and accident reports you have contributed.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const { canReview } = useRoles();
  const userId = user?.id;
  const [creatingPage, setCreatingPage] = useState(false);

  const { data: profile } = useQuery({
    enabled: !!userId,
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["my-alerts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["my-reports", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("user_id", userId!)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: articles = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["my-articles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("author_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["my-comments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: pages = [] } = useQuery({
    enabled: !!userId,
    queryKey: ["my-pages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("owner_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Your account
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">
        Habari, {profile?.display_name ?? "road user"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {profile?.county ? `Based in ${profile.county}. ` : ""}Thanks for helping keep Kenyan roads
        safer.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Alerts posted", value: alerts.length },
          { label: "Reports filed", value: reports.length },
          { label: "Articles written", value: articles.length },
          { label: "Comments", value: comments.length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-6 card-elevated">
            <p className="font-display text-3xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/alerts">Report a hazard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/reports">File an accident report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/news">Write an article</Link>
        </Button>
        <Dialog open={creatingPage} onOpenChange={setCreatingPage}>
          <DialogTrigger asChild>
            <Button variant="outline">Create a page</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Create a page</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              For any company or organisation. Once created, switch to it from the profile menu to
              post, write and comment as it.
            </p>
            <PageForm onDone={() => setCreatingPage(false)} />
          </DialogContent>
        </Dialog>
        {canReview ? (
          <Button asChild variant="secondary">
            <Link to="/moderate">Review queue</Link>
          </Button>
        ) : null}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Your alerts</h2>
        {alerts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You haven't posted any alerts yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {alerts.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={a.severity} />
                  <Link
                    to="/alerts/$alertId"
                    params={{ alertId: a.id }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {a.title}
                  </Link>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.county}
                  {a.road ? ` · ${a.road}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Your accident reports</h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No reports filed yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={r.severity} />
                  <Link
                    to="/reports/$reportId"
                    params={{ reportId: r.id }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {r.title}
                  </Link>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                      r.status === "approved"
                        ? "bg-safe/15 text-safe"
                        : r.status === "rejected"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-caution/20 text-caution"
                    }`}
                  >
                    {r.status === "pending" ? "awaiting review" : r.status}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {longDate(r.occurred_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.county}
                  {r.road ? ` · ${r.road}` : ""} · {r.fatalities} deaths, {r.casualties} injured
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Your articles</h2>
        {articles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            You haven't written anything yet.{" "}
            <Link to="/news" className="underline">
              Submit a story
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {articles.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{a.title}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${
                      a.status === "published"
                        ? "bg-safe/15 text-safe"
                        : a.status === "rejected"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-caution/20 text-caution"
                    }`}
                  >
                    {a.status === "pending_review" ? "awaiting review" : a.status}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(a.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.category}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Your pages</h2>
        {pages.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No organisation pages yet.{" "}
            <Link to="/pages" className="underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pages.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/pages/$slug"
                    params={{ slug: p.slug }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                      p.verified ? "bg-safe/15 text-safe" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.verified ? "verified" : "not verified"}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{p.category}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
