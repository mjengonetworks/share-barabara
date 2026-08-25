import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): { q: string } => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
  }),
  head: () => ({
    meta: [{ title: "Search: Share Barabara" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = q.trim();

  const { data: news = [], isLoading: newsLoading } = useQuery({
    queryKey: ["search-news", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, published_at")
        .eq("status", "published")
        .ilike("title", `%${term}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["search-alerts", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, county, created_at")
        .ilike("title", `%${term}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["search-reports", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("id, title, county, occurred_at")
        .eq("status", "approved")
        .ilike("title", `%${term}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = newsLoading || alertsLoading || reportsLoading;
  const totalResults = news.length + alerts.length + reports.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Search
      </p>
      <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold">
        <SearchIcon className="size-7 text-accent" />
        {term ? `Results for "${term}"` : "Search Share Barabara"}
      </h1>

      {term.length < 2 ? (
        <p className="mt-6 text-muted-foreground">Type at least two characters to search.</p>
      ) : null}
      {isLoading ? <p className="mt-6 text-muted-foreground">Searching…</p> : null}
      {!isLoading && term.length >= 2 && totalResults === 0 ? (
        <p className="mt-6 text-muted-foreground">No results found.</p>
      ) : null}

      {news.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold">News</h2>
          <ul className="mt-3 space-y-2">
            {news.map((n) => (
              <li key={n.id}>
                <Link
                  to="/news/$slug"
                  params={{ slug: n.slug }}
                  className="block rounded border border-border bg-card p-4 hover:border-accent"
                >
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{longDate(n.published_at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {alerts.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Alerts</h2>
          <ul className="mt-3 space-y-2">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  to="/alerts"
                  className="block rounded border border-border bg-card p-4 hover:border-accent"
                >
                  <p className="font-semibold">{a.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{a.county}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {reports.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Reports</h2>
          <ul className="mt-3 space-y-2">
            {reports.map((r) => (
              <li key={r.id}>
                <Link
                  to="/reports/$reportId"
                  params={{ reportId: r.id }}
                  className="block rounded border border-border bg-card p-4 hover:border-accent"
                >
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.county}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
