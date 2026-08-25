import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { longDate } from "@/lib/format";
import { NEWS_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "@/components/site/article-form";
import { BannerAd } from "@/components/site/banner-ad";

export const Route = createFileRoute("/news/")({
  validateSearch: (search: Record<string, unknown>): { category?: string } => {
    const category = typeof search["category"] === "string" ? (search["category"] as string) : undefined;
    return category ? { category } : {};
  },
  head: () => ({
    meta: [
      { title: "Road Safety News in Kenya: Share Barabara" },
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

type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  source: string | null;
  published_at: string;
  featured: boolean;
};

function ArticleGrid({ articles }: { articles: ArticleCard[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
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
  );
}

function NewsIndex() {
  const { user } = useAuth();
  const { category } = Route.useSearch();

  const { data: filtered = [], isLoading: filteredLoading } = useQuery({
    queryKey: ["news-category", category],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured")
        .eq("category", category as string)
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: latest = [] } = useQuery({
    queryKey: ["news-latest"],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: featured = [] } = useQuery({
    queryKey: ["news-featured"],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured")
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: trending = [] } = useQuery({
    queryKey: ["news-trending"],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", { hours_back: 8, result_limit: 3 });
      if (error) throw error;
      return data;
    },
  });

  const { data: all = [], isLoading: allLoading } = useQuery({
    queryKey: ["news"],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured")
        .order("published_at", { ascending: false })
        .limit(50);
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
          {category ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">{category}</h2>
                <Link to="/news" className="text-sm font-semibold text-accent-foreground underline">
                  All news
                </Link>
              </div>
              {filteredLoading ? <p className="mt-6 text-muted-foreground">Loading…</p> : null}
              {!filteredLoading && filtered.length === 0 ? (
                <p className="mt-6 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
                  No articles in this category yet.
                </p>
              ) : (
                <div className="mt-6">
                  <ArticleGrid articles={filtered} />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Latest news</h2>
                <a href="#all-articles" className="text-sm font-semibold text-accent-foreground underline">
                  Read more
                </a>
              </div>
              <div className="mt-5">
                <ArticleGrid articles={latest} />
              </div>

              <div className="mt-12">
                <h2 className="text-lg font-bold text-muted-foreground">Browse by category</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {NEWS_CATEGORIES.map((c) => (
                    <Link
                      key={c}
                      to="/news"
                      search={{ category: c }}
                      className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-foreground"
                    >
                      {c}
                    </Link>
                  ))}
                </div>
              </div>

              {featured.length > 0 ? (
                <div className="mt-12">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="flex items-center gap-2 text-2xl font-bold">
                      <Sparkles className="size-6 text-caution" /> Featured
                    </h2>
                    <a href="#all-articles" className="text-sm font-semibold text-accent-foreground underline">
                      Read more
                    </a>
                  </div>
                  <div className="mt-5">
                    <ArticleGrid articles={featured} />
                  </div>
                </div>
              ) : null}

              {trending.length > 0 ? (
                <div className="mt-12">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="flex items-center gap-2 text-2xl font-bold">
                      <Flame className="size-6 text-destructive" /> Trending
                    </h2>
                    <a href="#all-articles" className="text-sm font-semibold text-accent-foreground underline">
                      Read more
                    </a>
                  </div>
                  <div className="mt-5">
                    <ArticleGrid articles={trending} />
                  </div>
                </div>
              ) : null}

              <div className="mt-12">
                <BannerAd />
              </div>

              <div id="all-articles" className="mt-12 scroll-mt-24">
                <h2 className="text-2xl font-bold">More articles</h2>
                {allLoading ? <p className="mt-6 text-muted-foreground">Loading stories…</p> : null}
                <div className="mt-5">
                  <ArticleGrid articles={all} />
                </div>
              </div>
            </>
          )}
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
