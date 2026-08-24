import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { longDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "@/components/site/article-form";

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
  const { user } = useAuth();
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured")
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

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {isLoading ? <p className="text-muted-foreground">Loading stories…</p> : null}

          <div className="grid gap-6 md:grid-cols-2">
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

        <aside className="h-fit rounded-lg border border-border bg-card p-6 card-elevated lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Write for Share Barabara</h2>
          {user ? (
            <div className="mt-4">
              <ArticleForm />
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to submit a story. Editors review every submission before
                it is published.
              </p>
              <Button asChild className="mt-4 w-full">
                <Link to="/auth">Sign in to write</Link>
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}