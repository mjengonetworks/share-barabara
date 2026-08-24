import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Road Safety News in Kenya — Share Barabara" },
      {
        name: "description",
        content:
          "Latest Kenyan road safety news: enforcement operations, policy changes, black spot works and awareness campaigns, with open community discussion.",
      },
      { property: "og:title", content: "Road Safety News in Kenya" },
      {
        property: "og:description",
        content: "Enforcement, policy, infrastructure and awareness news for Kenyan road users.",
      },
    ],
  }),
  component: NewsIndex,
});

function NewsIndex() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Newsroom
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Road safety news</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Enforcement operations, policy shifts, infrastructure works and campaigns
        affecting how Kenyans travel. Every story is open for discussion.
      </p>

      {isLoading ? <p className="mt-10 text-muted-foreground">Loading stories…</p> : null}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {articles.map((a) => (
          <Link
            key={a.id}
            to="/news/$slug"
            params={{ slug: a.slug }}
            className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-shadow card-elevated hover:border-accent"
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              <span className="rounded bg-accent/20 px-2 py-0.5">{a.category}</span>
              {a.featured ? <span className="text-caution">Featured</span> : null}
            </div>
            <h2 className="mt-3 text-xl font-bold group-hover:underline">{a.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.summary}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {longDate(a.published_at)} {a.source ? `· ${a.source}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}