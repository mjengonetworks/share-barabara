import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanWriteArticles } from "@/hooks/useCanWriteArticles";
import { longDate } from "@/lib/format";
import { useNewsCategories } from "@/hooks/useTaxonomy";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "@/components/site/article-form";
import { BannerAd } from "@/components/site/banner-ad";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/news/")({
  validateSearch: (search: Record<string, unknown>): { category?: string } => {
    const category =
      typeof search["category"] === "string" ? (search["category"] as string) : undefined;
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
  image_url?: string | null;
};

function ArticleGrid({ articles }: { articles: ArticleCard[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {articles.map((a) => (
        <Link
          key={a.id}
          to="/news/$slug"
          params={{ slug: a.slug }}
          className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow card-elevated hover:border-accent"
        >
          {a.image_url ? (
            <img src={a.image_url} alt={a.title} className="aspect-video w-full object-cover" />
          ) : null}
          <div className="flex flex-1 flex-col p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              <span className="rounded bg-accent/20 px-2 py-0.5">{a.category}</span>
              {a.featured ? <span className="text-caution">Featured</span> : null}
            </div>
            <h2 className="mt-3 text-[0.875rem] font-bold text-brand-blue group-hover:underline">
              {a.title}
            </h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.summary}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              {longDate(a.published_at)} {a.source ? `· ${a.source}` : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ArticleCompactList({ articles }: { articles: ArticleCard[] }) {
  return (
    <ul className="mt-5 divide-y divide-border rounded-lg border border-border bg-card card-elevated">
      {articles.map((a) => (
        <li key={a.id}>
          <Link
            to="/news/$slug"
            params={{ slug: a.slug }}
            className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/40"
          >
            {a.image_url ? (
              <img
                src={a.image_url}
                alt={a.title}
                className="aspect-video w-28 shrink-0 rounded object-cover sm:w-36"
              />
            ) : (
              <div className="aspect-video w-28 shrink-0 rounded bg-muted sm:w-36" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
                <span className="rounded bg-accent/20 px-2 py-0.5">{a.category}</span>
                {a.featured ? <span className="text-caution">Featured</span> : null}
              </div>
              <h3 className="mt-1 truncate text-base font-bold text-brand-blue group-hover:underline sm:text-lg">
                {a.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {longDate(a.published_at)} {a.source ? `· ${a.source}` : ""}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NewsIndex() {
  const { user } = useAuth();
  const canWrite = useCanWriteArticles();
  const { category } = Route.useSearch();
  const { data: categories = [] } = useNewsCategories();

  const { data: filtered = [], isLoading: filteredLoading } = useQuery({
    queryKey: ["news-category", category],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured, image_url")
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
        .select("id, slug, title, summary, category, source, published_at, featured, image_url")
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
        .select("id, slug, title, summary, category, source, published_at, featured, image_url")
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
      const { data, error } = await supabase.rpc("trending_news", {
        hours_back: 8,
        result_limit: 3,
      });
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
        .select("id, slug, title, summary, category, source, published_at, featured, image_url")
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Newsroom
          </p>
          <h1 className="mt-2 text-[1.575rem] font-extrabold">Road safety news</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Enforcement operations, policy shifts, infrastructure works and campaigns affecting how
            Kenyans travel. Every story is open for discussion.
          </p>
        </div>
        <WriteButton signedIn={!!user} canWrite={canWrite} />
      </div>

      <div className="mt-10">
        {category ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[1.05rem] font-bold">{category}</h2>
              <Link to="/news" className="text-sm font-semibold text-brand-blue underline">
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
              <h2 className="text-[1.05rem] font-bold">Latest news</h2>
              <a href="#all-articles" className="text-sm font-semibold text-brand-blue underline">
                Read more
              </a>
            </div>
            <div className="mt-5">
              <ArticleGrid articles={latest} />
            </div>

            <div className="mt-12">
              <h2 className="text-lg font-bold text-muted-foreground">Browse by category</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to="/news"
                    search={{ category: c.name }}
                    className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent-foreground"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            {featured.length > 0 ? (
              <div className="mt-12">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="flex items-center gap-2 text-[1.05rem] font-bold">
                    <Sparkles className="size-6 text-caution" /> Featured
                  </h2>
                  <a
                    href="#all-articles"
                    className="text-sm font-semibold text-brand-blue underline"
                  >
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
                  <h2 className="flex items-center gap-2 text-[1.05rem] font-bold">
                    <Flame className="size-6 text-destructive" /> Trending
                  </h2>
                  <a
                    href="#all-articles"
                    className="text-sm font-semibold text-brand-blue underline"
                  >
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
              <h2 className="text-[1.05rem] font-bold">More articles</h2>
              {allLoading ? <p className="mt-6 text-muted-foreground">Loading stories…</p> : null}
              <ArticleCompactList articles={all} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WriteButton({ signedIn, canWrite }: { signedIn: boolean; canWrite: boolean }) {
  if (!signedIn) {
    return (
      <Button asChild variant="outline">
        <Link to="/auth">Sign in to write</Link>
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Write for Share Barabara</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Write for Share Barabara</DialogTitle>
        </DialogHeader>
        {canWrite ? (
          <>
            <p className="text-sm text-muted-foreground">
              Editors review every submission before it is published.
            </p>
            <ArticleForm />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-5 text-center">
            <p className="font-semibold">Writing articles is a subscriber perk</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Subscribe to submit articles for our editors to review and publish.
            </p>
            <Button asChild className="mt-4">
              <Link to="/subscribe">Subscribe</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
