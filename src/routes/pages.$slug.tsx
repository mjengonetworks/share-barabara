import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  CarFront,
  Globe,
  MapPin,
  MessageSquare,
  Newspaper,
  Phone,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { longDate, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/site/severity-badge";
import { PageForm } from "@/components/site/page-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/pages/$slug")({
  head: () => ({
    meta: [
      { title: "Page: Share Barabara" },
      {
        name: "description",
        content:
          "An organisation's contributions on Share Barabara: alerts, reports, articles and comments.",
      },
    ],
  }),
  component: PageProfile,
});

function PageProfile() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["page-alerts", page?.id],
    enabled: !!page?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("page_id", page!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["page-reports", page?.id],
    enabled: !!page?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("page_id", page!.id)
        .order("occurred_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ["page-articles", page?.id],
    enabled: !!page?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category, published_at")
        .eq("page_id", page!.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["page-comments", page?.id],
    enabled: !!page?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("page_id", page!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-5xl px-4 py-20 text-muted-foreground">Loading page…</p>;
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <Link to="/pages" className="mt-4 inline-block underline">
          Back to pages
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === page.owner_id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        {page.category}
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="mt-2 flex items-center gap-2 text-4xl font-extrabold">
          <span className="flex size-10 items-center justify-center rounded bg-accent/20 text-accent-foreground">
            <Building2 className="size-6" />
          </span>
          {page.name}
          {page.verified ? (
            <BadgeCheck className="size-7 text-accent" aria-label="Verified page" />
          ) : null}
        </h1>
        {isOwner ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit page
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-muted-foreground">
        {page.county ? `${page.county} · ` : ""}Contributing since {longDate(page.created_at)}
      </p>
      {page.description ? (
        <p className="mt-3 max-w-2xl text-foreground/90">{page.description}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        {page.website_url ? (
          <a
            href={page.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            <Globe className="size-4" /> Website
          </a>
        ) : null}
        {page.phone ? (
          <a href={`tel:${page.phone}`} className="flex items-center gap-1 underline">
            <Phone className="size-4" /> {page.phone}
          </a>
        ) : null}
      </div>
      {!page.verified ? (
        <p className="mt-4 rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          This page is not yet verified.{" "}
          <Link to="/subscribe" className="underline">
            Learn about Page verification
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Alerts", value: alerts.length },
          { label: "Reports filed", value: reports.length },
          { label: "Articles", value: articles.length },
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
          <Newspaper className="size-5 text-accent" /> Articles
        </h2>
        {articles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No articles published yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {articles.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                    {a.category}
                  </span>
                  <Link
                    to="/news/$slug"
                    params={{ slug: a.slug }}
                    className="font-semibold hover:underline"
                  >
                    {a.title}
                  </Link>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {longDate(a.published_at)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
                  {a.county}
                  {a.road ? ` · ${a.road}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <CarFront className="size-5 text-accent" /> Accident reports
        </h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No reports published yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge value={r.severity} />
                  <Link to="/reports" className="font-semibold hover:underline">
                    {r.title}
                  </Link>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {longDate(r.occurred_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.county}
                  {r.road ? ` · ${r.road}` : ""}
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

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit page</DialogTitle>
          </DialogHeader>
          <PageForm existing={page} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
