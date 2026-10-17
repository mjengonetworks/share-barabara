import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanWriteArticles } from "@/hooks/useCanWriteArticles";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "@/components/site/article-form";
import { BannerAd } from "@/components/site/banner-ad";
import { PublicPageHero } from "@/components/site/public-page-hero";
import heroRoad from "@/assets/hero-road.jpg";
import { AdInterleave } from "@/components/site/ad-interleave";
import {
  CompactArticleCard,
  CompactEditorialColumns,
  EditorialBand,
  SectionHeader,
} from "@/components/site/public-layout";
import { AlertPreviewCard, ReportPreviewCard } from "@/components/site/discovery-sections";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/news/")({
  validateSearch: (search: Record<string, unknown>): { category?: string } => {
    const category = typeof search.category === "string" ? search.category : undefined;
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
  loader: async (): Promise<NewsIndexLoaderData> => {
    const [all, trendingResult, relatedAlertsResult, relatedReportsResult] = await Promise.all([
      fetchPublishedArticles(),
      supabase.rpc("trending_news", { hours_back: 48, result_limit: 12 }),
      supabase
        .from("alerts")
        .select("id, title, description, county, road, hazard_type, severity, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("accident_reports")
        .select(
          "id, title, description, county, road, severity, occurred_at, image_url, vehicles_involved, casualties, fatalities",
        )
        .eq("status", "approved")
        .order("occurred_at", { ascending: false })
        .limit(3),
    ]);
    if (trendingResult.error) throw trendingResult.error;
    if (relatedAlertsResult.error) throw relatedAlertsResult.error;
    if (relatedReportsResult.error) throw relatedReportsResult.error;
    const categories = Array.from(
      new Set(
        all.flatMap(
          (article) =>
            [article.category, ...(article.categories ?? [])].filter(Boolean) as string[],
        ),
      ),
    );
    const analysis = all.filter((article) =>
      [article.category, ...(article.categories ?? [])]
        .filter(Boolean)
        .some((value) => /analysis|safety/i.test(value as string)),
    );
    return {
      all,
      latest: all.slice(0, 12),
      featured: all.filter((article) => article.featured).slice(0, 12),
      analysis: analysis.slice(0, 12),
      trending: (trendingResult.data ?? []) as ArticleCard[],
      relatedAlerts: relatedAlertsResult.data ?? [],
      relatedReports: relatedReportsResult.data ?? [],
      categories,
    };
  },
  component: NewsIndex,
});

type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string | null;
  source: string | null;
  published_at: string | null;
  featured: boolean | null;
  image_url?: string | null;
  categories?: string[] | null;
};

function MostViewed({ articles }: { articles: ArticleCard[] }) {
  if (!articles.length) return null;
  return (
    <EditorialBand tone="plain">
      <SectionHeader
        eyebrow="Verified view activity · 48 hours"
        title="Most Viewed"
        to="/news"
        actionLabel="Browse all"
      />
      <ol className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, 6).map((article, index) => (
          <li key={article.id} className="flex gap-3 border-b border-border/70 pb-4">
            <span className="font-display text-3xl font-extrabold leading-none text-accent">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Link
              to="/news/$slug"
              params={{ slug: article.slug }}
              className="font-bold leading-snug text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ol>
    </EditorialBand>
  );
}

function LatestStrip({ articles }: { articles: ArticleCard[] }) {
  if (!articles.length) return null;
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card card-elevated">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
        <span className="shrink-0 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-blue">
          Latest update
        </span>
        <div className="grid min-w-0 flex-1 gap-2 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {articles.slice(0, 3).map((article) => (
            <Link
              key={article.id}
              to="/news/$slug"
              params={{ slug: article.slug }}
              className="truncate px-0 text-sm font-semibold hover:text-brand-blue hover:underline sm:px-4 first:sm:pl-0"
            >
              {article.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
const articleSelect =
  "id, slug, title, summary, category, source, published_at, featured, image_url, categories";

type NewsIndexLoaderData = {
  all: ArticleCard[];
  latest: ArticleCard[];
  featured: ArticleCard[];
  analysis: ArticleCard[];
  trending: ArticleCard[];
  relatedAlerts: Array<Record<string, unknown>>;
  relatedReports: Array<Record<string, unknown>>;
  categories: string[];
};

async function fetchPublishedArticles(limit = 50) {
  const { data, error } = await supabase
    .from("news")
    .select(articleSelect)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ArticleCard[];
}

function usePublishedQuery({
  name,
  category,
  limit = 12,
  initialData,
}: {
  name: string;
  category?: string;
  limit?: number;
  initialData?: ArticleCard[];
}) {
  return useQuery({
    queryKey: ["news-task70", name, category, limit],
    initialData,
    queryFn: async () => {
      let query = supabase.from("news").select(articleSelect).eq("status", "published");
      if (category) {
        query = query.or(`category.eq.${category},categories.cs.{${category}}`);
      }
      const { data, error } = await query.order("published_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data as ArticleCard[];
    },
  });
}

function ArticleGridWithAds({
  articles,
  placement,
}: {
  articles: ArticleCard[];
  placement: string;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <AdInterleave
        items={articles}
        placement={placement}
        adClassName="col-span-full"
        renderItem={(article) => <CompactArticleCard article={article} />}
      />
    </div>
  );
}

function CategoryEditorialModules({ articles }: { articles: ArticleCard[] }) {
  const groups = new Map<string, ArticleCard[]>();
  for (const article of articles) {
    const category = article.category?.trim();
    if (!category) continue;
    const group = groups.get(category) ?? [];
    if (!group.some((item) => item.id === article.id)) group.push(article);
    groups.set(category, group);
  }
  const modules = Array.from(groups.entries()).filter(([, items]) => items.length > 0);
  if (!modules.length) return <EmptyState label="No published articles have categories yet." />;
  return (
    <div className="space-y-0">
      {modules.map(([category, items], index) => (
        <div key={category}>
          {index > 0 && index % 4 === 0 ? <div className="py-6"><BannerAd placement={`news-more-category-interval-${index / 4}`} /></div> : null}
          <div className="border-b border-border/70 py-7 first:pt-0 last:border-b-0">
            <SectionHeader
              eyebrow="Published category"
              title={category}
              to="/news"
              actionLabel="View more"
            />
            <div className="mt-5">
              <CompactEditorialColumns
                articles={items.slice(0, 9)}
                placement={`news-category-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                titles={["Lead story", "Latest in this topic", "More from this topic"]}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopicSection({
  title,
  eyebrow,
  articles,
  tone = "plain",
  placement,
  optional = false,
}: {
  title: string;
  eyebrow?: string;
  articles: ArticleCard[];
  tone?: "plain" | "pale";
  placement: string;
  optional?: boolean;
}) {
  if (optional && !articles.length) return null;

  return (
    <EditorialBand tone={tone}>
      <SectionHeader eyebrow={eyebrow} title={title} to="/news" actionLabel="Read more" />
      {articles.length ? (
        <div className="mt-6">
          <CompactEditorialColumns
            articles={articles.slice(0, 12)}
            placement={placement}
            titles={
              title === "Trending Articles"
                ? ["Most opened", "Trending now", "More trending"]
                : ["Lead stories", "On the road", "Community watch"]
            }
          />
        </div>
      ) : (
        <EmptyState label="No published articles are available in this section yet." />
      )}
    </EditorialBand>
  );
}

function NewsIndex() {
  const { user } = useAuth();
  const canWrite = useCanWriteArticles();
  const { category } = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const [featuredLimit, setFeaturedLimit] = useState(12);
  const [trendingLimit, setTrendingLimit] = useState(12);
  const { data: filtered = [], isLoading: filteredLoading } = usePublishedQuery({
    name: "category",
    category,
    limit: 50,
    initialData: category
      ? loaderData.all.filter(
          (article) => article.category === category || article.categories?.includes(category),
        )
      : undefined,
  });
  const { data: latest = [] } = usePublishedQuery({
    name: "latest",
    limit: 12,
    initialData: loaderData.latest,
  });
  const { data: all = [], isLoading: allLoading } = usePublishedQuery({
    name: "all",
    limit: 50,
    initialData: loaderData.all,
  });
  const { data: featured = [] } = useQuery({
    queryKey: ["news-task70-featured", featuredLimit],
    initialData: loaderData.featured.slice(0, featuredLimit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select(articleSelect)
        .eq("status", "published")
        .eq("featured", true)
        .order("published_at", { ascending: false })
        .limit(featuredLimit);
      if (error) throw error;
      return data as ArticleCard[];
    },
    enabled: !category,
  });
  const { data: analysis = [] } = useQuery({
    queryKey: ["news-task70-analysis"],
    initialData: loaderData.analysis,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select(articleSelect)
        .eq("status", "published")
        .or("category.ilike.%analysis%,category.ilike.%safety%")
        .order("published_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as ArticleCard[];
    },
    enabled: !category,
  });
  const { data: trending = [] } = useQuery({
    queryKey: ["news-task70-trending", trendingLimit],
    initialData: loaderData.trending.slice(0, trendingLimit),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", {
        hours_back: 48,
        result_limit: trendingLimit,
      });
      if (error) throw error;
      return (data ?? []) as ArticleCard[];
    },
    enabled: !category,
  });
  const { data: relatedAlerts = [] } = useQuery({
    queryKey: ["news-task70-alerts"],
    initialData: loaderData.relatedAlerts,
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
    enabled: !category,
  });
  const { data: relatedReports = [] } = useQuery({
    queryKey: ["news-task70-reports"],
    initialData: loaderData.relatedReports,
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
    enabled: !category,
  });

  return (
    <div className="w-full py-8 sm:py-10">
      <PublicPageHero
        eyebrow="Share Barabara newsroom"
        title="News & Articles"
        titleAccent="Articles"
        description="Road safety reporting, transport insight and community stories about how Kenyans travel and how we can make every journey safer."
        image={heroRoad}
        fullBleed
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {!category ? <LatestStrip articles={latest} /> : null}
        <nav
          aria-label="Filter articles by category"
          className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          <Link
            to="/news"
            aria-current={!category ? "page" : undefined}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              !category
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-border bg-card hover:border-accent hover:text-accent-foreground"
            }`}
          >
            All articles
          </Link>
          {loaderData.categories.map((categoryName) => (
            <Link
              key={categoryName}
              to="/news"
              search={{ category: categoryName }}
              aria-current={category === categoryName ? "page" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                category === categoryName
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-[#CFE2FA] bg-[#EAF3FF] text-[#174A87] hover:border-brand-blue"
              }`}
            >
              {categoryName}
            </Link>
          ))}
        </nav>
        {user && canWrite ? (
          <div className="mt-4 flex justify-end">
            <WriteButton signedIn={!!user} canWrite={canWrite} />
          </div>
        ) : null}
        {category ? (
          <EditorialBand className="mt-8" tone="plain">
            <SectionHeader
              eyebrow="Newsroom category"
              title={category}
              to="/news"
              actionLabel="All articles"
            />
            {filteredLoading ? (
              <p className="mt-6 text-muted-foreground">Loading published articles…</p>
            ) : null}
            {!filteredLoading && !filtered.length ? (
              <EmptyState label="No published articles in this category yet." />
            ) : (
              <div className="mt-6">
                <ArticleGridWithAds articles={filtered} placement="news-category" />
              </div>
            )}
          </EditorialBand>
        ) : (
          <div className="mt-8 space-y-0">
            <TopicSection
              title="Trending Articles"
              eyebrow="What readers are opening"
              articles={trending}
              tone="pale"
              placement="news-trending"
            />
            {trending.length === trendingLimit ? (
              <LoadMore onClick={() => setTrendingLimit((value) => value + 6)} />
            ) : null}
            <TopicSection
              title="Latest Articles"
              eyebrow="The newsroom"
              articles={latest}
              placement="news-latest"
            />
            <MostViewed articles={trending} />
            {featured.length ? (
              <EditorialBand tone="pale">
                <SectionHeader
                  eyebrow="Editors' selection"
                  title="Featured / Prime Articles"
                  icon={<Sparkles className="size-5 text-caution" aria-hidden="true" />}
                  to="/news"
                  actionLabel="Read more"
                />
                <div className="mt-6">
                  <CompactEditorialColumns
                    articles={featured}
                    placement="news-featured"
                    titles={["Featured lead", "Prime selection", "Editor picks"]}
                  />
                </div>
                {featured.length === featuredLimit ? (
                  <LoadMore onClick={() => setFeaturedLimit((value) => value + 6)} />
                ) : null}
              </EditorialBand>
            ) : null}
            <EditorialBand tone="plain">
              <SectionHeader
                eyebrow="Browse the newsroom"
                title="Articles by Category"
                description="Explore published reporting by the topics that shape safer journeys."
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {loaderData.categories.map((categoryName) => (
                  <Link
                    key={categoryName}
                    to="/news"
                    search={{ category: categoryName }}
                    aria-current={category === categoryName ? "page" : undefined}
                    className="rounded-full border border-[#CFE2FA] bg-[#EAF3FF] px-4 py-2 text-sm font-semibold text-[#174A87] transition-colors hover:border-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categoryName}
                  </Link>
                ))}
              </div>
            </EditorialBand>
            <TopicSection
              title="Road Safety Analysis"
              eyebrow="Evidence and context"
              articles={analysis}
              tone="pale"
              placement="news-analysis"
              optional
            />
            {relatedReports.length ? (
              <EditorialBand tone="plain">
                <SectionHeader
                  eyebrow="Road context"
                  title="Related Accident Reports"
                  description="Published public reports that help place road-safety coverage in context."
                  to="/reports"
                  actionLabel="View reports"
                />
                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {relatedReports.map((report) => (
                    <ReportPreviewCard key={report.id} report={report} />
                  ))}
                </div>
              </EditorialBand>
            ) : null}
            {relatedAlerts.length ? (
              <EditorialBand tone="pale">
                <SectionHeader
                  eyebrow="Live road context"
                  title="Relevant Alerts"
                  description="Only active alerts are shown here; resolved and expired alerts stay out of the current-news flow."
                  to="/alerts"
                  actionLabel="View alerts"
                />
                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {relatedAlerts.map((alert) => (
                    <AlertPreviewCard key={alert.id} alert={alert} />
                  ))}
                </div>
                <div className="mt-8">
                  <BannerAd placement="news-context-midpoint" />
                </div>
              </EditorialBand>
            ) : null}
            <EditorialBand tone="plain" className="scroll-mt-24">
              <div id="all-articles">
                <SectionHeader
                  eyebrow="Keep reading"
                  title="More Articles"
                  to="/news"
                  actionLabel="Browse all"
                />
                {allLoading ? (
                  <p className="mt-6 text-muted-foreground">Loading published stories…</p>
                ) : null}
                <div className="mt-6">
                  {allLoading ? null : <CategoryEditorialModules articles={all} />}
                </div>
              </div>
            </EditorialBand>
          </div>
        )}
        <MjengoPreviews context="articles" />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {label}
    </p>
  );
}
function LoadMore({ onClick }: { onClick: () => void }) {
  return (
    <div className="bg-background py-3 text-center">
      <button
        type="button"
        onClick={onClick}
        className="text-sm font-bold text-brand-blue underline"
      >
        Read more
      </button>
    </div>
  );
}
function WriteButton({ signedIn, canWrite }: { signedIn: boolean; canWrite: boolean }) {
  if (!signedIn)
    return (
      <Button asChild variant="outline">
        <Link to="/auth">Sign in to write</Link>
      </Button>
    );
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
