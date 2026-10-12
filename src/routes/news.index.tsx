import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanWriteArticles } from "@/hooks/useCanWriteArticles";
import { useNewsCategories } from "@/hooks/useTaxonomy";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "@/components/site/article-form";
import { BannerAd } from "@/components/site/banner-ad";
import { PublicPageHero } from "@/components/site/public-page-hero";
import heroRoad from "@/assets/hero-road.jpg";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { AdInterleave } from "@/components/site/ad-interleave";
import {
  CompactArticleCard,
  EditorialBand,
  FeaturedLeadCard,
  SectionHeader,
} from "@/components/site/public-layout";
import { AlertPreviewCard, ReportPreviewCard } from "@/components/site/discovery-sections";
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
      { title: "News & Articles | Share Barabara" },
      {
        name: "description",
        content:
          "News and articles about Kenyan road safety, transport, infrastructure and the people working to make every journey safer.",
      },
      { property: "og:title", content: "News & Articles | Share Barabara" },
      {
        property: "og:description",
        content:
          "Road safety reporting, transport insight and community stories for Kenyan road users.",
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

// The shared fallback keeps the established aspect-video and Newspaper className contracts.

function ArticleGrid({
  articles,
  placement = "news-list",
}: {
  articles: ArticleCard[];
  placement?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <AdInterleave
        items={articles}
        placement={placement}
        adClassName="col-span-full"
        renderItem={(a, index) => (
          <div className={index === 0 ? "md:col-span-2" : ""}>
            {index === 0 ? <FeaturedLeadCard article={a} /> : <CompactArticleCard article={a} />}
          </div>
        )}
      />
    </div>
  );
}

function ArticleCompactList({ articles }: { articles: ArticleCard[] }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <AdInterleave
        items={articles}
        placement="news-compact-list"
        adClassName="col-span-full"
        renderItem={(a) => <CompactArticleCard article={a} />}
      />
    </div>
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
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const [featuredLimit, setFeaturedLimit] = useState(3);
  const { data: featured = [] } = useQuery({
    queryKey: ["news-featured", featuredLimit],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, category, source, published_at, featured, image_url")
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(featuredLimit);
      if (error) throw error;
      return data;
    },
  });

  const [trendingLimit, setTrendingLimit] = useState(3);
  const { data: trending = [] } = useQuery({
    queryKey: ["news-trending", trendingLimit],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", {
        hours_back: 8,
        result_limit: trendingLimit,
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

  const { data: relatedAlerts = [] } = useQuery({
    queryKey: ["news-context-alerts"],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, description, county, road, hazard_type, severity, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedReports = [] } = useQuery({
    queryKey: ["news-context-reports"],
    enabled: !category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select(
          "id, title, description, county, road, severity, occurred_at, image_url, vehicles_involved, casualties, fatalities",
        )
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <PublicPageHero
        eyebrow="Newsroom"
        title="News & Articles"
        description="Road safety reporting, transport insight and community stories about how Kenyans travel and how we can make every journey safer."
        image={heroRoad}
      />
      {user && canWrite ? (
        <div className="mt-4 flex justify-end">
          <WriteButton signedIn={!!user} canWrite={canWrite} />
        </div>
      ) : null}

      <div className="mt-10">
        {category ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[1.155rem] font-bold">{category}</h2>
              <Link to="/news" className="text-sm font-semibold text-brand-blue underline">
                All News & Articles
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
            <EditorialBand tone="plain">
              <SectionHeader
                eyebrow="The newsroom"
                title="Latest News & Articles"
                description="The newest road-safety reporting and community stories, led by one prominent story and compact secondary reads."
              />
              <div className="mt-5">
                <ArticleGrid articles={latest} placement="news-latest" />
              </div>
            </EditorialBand>
            <div className="mt-6 text-center">
              <a href="#all-articles" className="text-base font-semibold text-brand-blue underline">
                Read more
              </a>
            </div>

            <EditorialBand tone="pale">
              <SectionHeader
                title="Browse by category"
                description="Find reporting by the topics that shape safer journeys."
              />
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
            </EditorialBand>

            {featured.length > 0 ? (
              <EditorialBand tone="plain">
                <SectionHeader
                  eyebrow="Editor’s selection"
                  title="Featured & Prime"
                  icon={<Sparkles className="size-5 text-caution" aria-hidden="true" />}
                />
                <div className="mt-5">
                  <ArticleGrid articles={featured} placement="news-featured" />
                </div>
                {featured.length === featuredLimit ? (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setFeaturedLimit((n) => n + 6)}
                      className="text-base font-semibold text-brand-blue underline"
                    >
                      Read more
                    </button>
                  </div>
                ) : null}
              </EditorialBand>
            ) : null}

            {trending.length > 0 ? (
              <EditorialBand tone="pale">
                <SectionHeader
                  eyebrow="What readers are opening"
                  title="Trending articles"
                  icon={<Flame className="size-5 text-destructive" aria-hidden="true" />}
                />
                <div className="mt-5">
                  <ArticleGrid articles={trending} placement="news-trending" />
                </div>
                {trending.length === trendingLimit ? (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setTrendingLimit((n) => n + 6)}
                      className="text-base font-semibold text-brand-blue underline"
                    >
                      Read more
                    </button>
                  </div>
                ) : null}
              </EditorialBand>
            ) : null}

            <EditorialBand tone="plain">
              <SectionHeader
                eyebrow="Road context"
                title="Reports and alerts to read alongside the news"
                description="Current public road-safety signals that help place reporting in context."
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {relatedReports.length > 0 ? (
                  <div>
                    <h3 className="mb-3 text-lg font-bold">Latest accident reports</h3>
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                      {relatedReports.map((report) => (
                        <ReportPreviewCard key={report.id} report={report} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {relatedAlerts.length > 0 ? (
                  <div>
                    <h3 className="mb-3 text-lg font-bold">Active alerts</h3>
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                      {relatedAlerts.map((alert) => (
                        <AlertPreviewCard key={alert.id} alert={alert} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-8">
                <BannerAd placement="news-context-midpoint" />
              </div>
            </EditorialBand>

            <EditorialBand tone="pale" className="scroll-mt-24">
              <div id="all-articles" className="scroll-mt-24">
                <SectionHeader title="More articles" to="/news" actionLabel="Browse all" />
                {allLoading ? <p className="mt-6 text-muted-foreground">Loading stories…</p> : null}
                <ArticleCompactList articles={all} />
              </div>
              <MjengoPreviews context="articles" />
            </EditorialBand>
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
