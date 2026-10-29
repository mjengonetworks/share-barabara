import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  CompactArticleRow,
  CategoryEntityCard,
  EditorialBand,
  SectionHeader,
} from "@/components/site/public-layout";
import { AlertPreviewCard, ReportPreviewCard } from "@/components/site/discovery-sections";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { GlobalEditorialPreview } from "@/components/site/global-editorial-preview";
import {
  publicCategoryNavigationClass,
  publicCategoryNavigationSelectedClass,
} from "@/components/site/public-ui";
import { EditorialDiscoveryRail } from "@/components/site/editorial-discovery";
import { groupLatestByEntity } from "@/lib/category-entity";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/news/")({
  validateSearch: (search: Record<string, unknown>): { category?: string; sort?: "trending"; range?: TrendingRange } => {
    const category = typeof search.category === "string" ? search.category : undefined;
    const sort = search.sort === "trending" ? "trending" : undefined;
    const range = ["24h", "7d", "month", "year"].includes(String(search.range)) ? String(search.range) as TrendingRange : undefined;
    return { ...(category ? { category } : {}), ...(sort ? { sort } : {}), ...(range ? { range } : {}) };
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
      supabase.rpc("trending_news", { hours_back: 168, result_limit: 12 }),
      supabase
        .from("alerts")
        .select("id, title, description, county, road, hazard_type, severity, image_url, created_at")
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
type TrendingRange = "24h" | "7d" | "month" | "year";

function LatestStrip({ articles }: { articles: ArticleCard[] }) {
  if (!articles.length) return null;
  return (
    <section aria-labelledby="latest-news-updates" className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <span className="shrink-0 text-xs font-extrabold uppercase tracking-[0.18em] text-brand-blue">
          Latest updates
        </span>
        <Link to="/news" className="text-xs font-bold text-brand-blue underline underline-offset-2">
          View all
        </Link>
      </div>
      <div id="latest-news-updates" className="mt-3 grid gap-3 sm:grid-cols-3">
        {articles.slice(0, 3).map((article) => (
          <Link
            key={article.id}
            to="/news/$slug"
            params={{ slug: article.slug }}
            className="group flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card p-3 card-elevated hover:border-accent"
          >
            {article.image_url ? (
              <img
                src={article.image_url}
                alt=""
                loading="lazy"
                className="size-14 shrink-0 rounded object-cover"
              />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded bg-primary/5 text-[10px] text-muted-foreground">
                News
              </span>
            )}
            <span className="min-w-0 text-sm font-semibold leading-snug group-hover:text-brand-blue group-hover:underline">
              {article.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CategoryFilters({ categories, active }: { categories: string[]; active?: string }) {
  return (
    <nav
      aria-label="Filter articles by category"
      className="flex min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      <Link
        to="/news"
        aria-current={!active ? "page" : undefined}
        className={!active ? publicCategoryNavigationSelectedClass : publicCategoryNavigationClass}
      >
        All articles
      </Link>
      {categories.map((category) => (
        <Link
          key={category}
          to="/news"
          search={{ category }}
          aria-current={active === category ? "page" : undefined}
          className={
            active === category
              ? publicCategoryNavigationSelectedClass
              : publicCategoryNavigationClass
          }
        >
          {category}
        </Link>
      ))}
    </nav>
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

function CategoryEntityGrid({ articles }: { articles: ArticleCard[] }) {
  const modules = groupLatestByEntity(articles);
  if (!modules.length) return <EmptyState label="No published articles have categories yet." />;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map(({ entity, items }) => (
        <CategoryEntityCard
          key={entity}
          entity={entity}
          articles={items}
          viewMoreHref={`/news?category=${encodeURIComponent(entity)}`}
          placement={`news-category-${entity.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        />
      ))}
    </div>
  );
}

function NewsIndex() {
  const { user } = useAuth();
  const canWrite = useCanWriteArticles();
  const { category, sort, range = "7d" } = Route.useSearch();
  const loaderData = Route.useLoaderData();
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
  const { data: relatedAlerts = [] } = useQuery({
    queryKey: ["news-task70-alerts"],
    initialData: loaderData.relatedAlerts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, title, description, county, road, hazard_type, severity, image_url, created_at")
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
    <div className="w-full py-5 sm:py-7">
      <PublicPageHero
        eyebrow="Share Barabara newsroom"
        title="News & Articles"
        titleAccent="Articles"
        description="Road safety reporting, transport insight and community stories about how Kenyans travel and how we can make every journey safer."
        image={heroRoad}
        fullBleed
        compact
      >
        <div className="basis-full min-w-0">
          <CategoryFilters categories={loaderData.categories} active={category} />
        </div>
      </PublicPageHero>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {user && canWrite ? (
          <div className="mt-4 flex justify-end">
            <WriteButton signedIn={!!user} canWrite={canWrite} />
          </div>
        ) : null}
        {sort === "trending" ? (
          <EditorialBand className="py-5 sm:py-7" tone="plain">
            <SectionHeader
              eyebrow="Ranked by recorded views"
              title="Trending News"
              description="The most-read eligible articles, ordered by the established trending ranking."
              to="/news"
              actionLabel="All articles"
            />
            <TrendingNewsView articles={loaderData.trending} range={range} category={category} />
          </EditorialBand>
        ) : category ? (
          <EditorialBand className="mt-4 py-5 sm:py-7" tone="plain">
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
          <div className="mt-4 space-y-0">
            <EditorialBand className="py-5 sm:py-7" tone="plain">
              <SectionHeader
                eyebrow="Fresh from the newsroom"
                title="Latest News"
                description="The newest published Share Barabara reporting and road-safety stories."
                to="/news"
                actionLabel="Read more"
              />
              <div className="mt-6">
                <ArticleGridWithAds articles={latest.slice(0, 3)} placement="news-latest" />
              </div>
              <div className="mt-5 text-center">
                <Link to="/news" className="text-sm font-bold text-brand-blue underline underline-offset-4">
                  Read more
                </Link>
              </div>
            </EditorialBand>
            <EditorialBand className="py-5 sm:py-7" tone="pale">
                <SectionHeader
                  eyebrow="Editor-selected coverage"
                  title="Featured Articles"
                  to="/news"
                  actionLabel="Read more"
                />
                {loaderData.featured.length ? (
                  <div className="mt-5">
                    <ArticleGridWithAds articles={loaderData.featured.slice(0, 3)} placement="news-featured" />
                  </div>
                ) : (
                  <EmptyState label="No Featured Articles have been selected by editors yet." />
                )}
                <div className="mt-5 text-center">
                  <Link to="/news" className="text-sm font-bold text-brand-blue underline underline-offset-4">
                    Read more
                  </Link>
                </div>
            </EditorialBand>
            {loaderData.trending.length ? (
              <EditorialBand className="py-5 sm:py-7" tone="plain">
                <SectionHeader
                  eyebrow="Ranked by recorded views"
                  title="Trending News"
                  to="/news"
                  actionLabel="Read more"
                />
                <ArticleGridWithAds articles={loaderData.trending.slice(0, 3)} placement="news-trending" />
                <div className="mt-5 text-center">
                  <Link to="/news" search={{ sort: "trending" }} className="text-sm font-bold text-brand-blue underline underline-offset-4">
                    Read more
                  </Link>
                </div>
              </EditorialBand>
            ) : null}
            <EditorialBand className="py-5 sm:py-7" tone="plain">
              <SectionHeader
                eyebrow="Browse the newsroom"
                title="Browse by Category"
                description="Explore published reporting by the topics that shape safer journeys."
              />
              <div className="mt-6">
                {allLoading ? (
                  <p className="text-muted-foreground">Loading published categories…</p>
                ) : null}
                {!allLoading ? <CategoryEntityGrid articles={all} /> : null}
              </div>
            </EditorialBand>
            {relatedReports.length ? (
              <EditorialBand className="py-5 sm:py-7" tone="plain">
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
              <EditorialBand className="py-5 sm:py-7" tone="pale">
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
          </div>
        )}
        <GlobalEditorialPreview
          destination="news"
          category={category}
          excludeKeys={
            sort === "trending" ? loaderData.trending.map((item) => `news:${item.id}`) : []
          }
        />
        <EditorialDiscoveryRail exclude="news" />
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

function TrendingNewsView({ articles: initial, range, category }: { articles: ArticleCard[]; range: TrendingRange; category?: string }) {
  const hours = { "24h": 24, "7d": 168, month: 720, year: 8760 }[range];
  const { data: ranked = initial } = useQuery({
    queryKey: ["news-trending-window", hours, category],
    initialData: initial,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", { hours_back: hours, result_limit: 30 });
      if (error) throw error;
      const rows = (data ?? []) as ArticleCard[];
      return category ? rows.filter((article) => article.category === category || article.categories?.includes(category)) : rows;
    },
  });
  const lead = ranked[0];
  const secondary = ranked.slice(1, 7);
  if (!lead) return <EmptyState label="No view-ranked articles are available for this time window." />;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-2" aria-label="Trending time window">
        {(["24h", "7d", "month", "year"] as TrendingRange[]).map((value) => (
          <Link key={value} to="/news" search={{ sort: "trending", ...(category ? { category } : {}), range: value }} className={value === range ? "rounded-full bg-brand-blue px-3 py-1.5 text-xs font-bold text-white" : "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-brand-blue"}>
            {value === "24h" ? "Last 24 hours" : value === "7d" ? "Past 7 days" : value === "month" ? "Past month" : "Past year"}
          </Link>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <CompactArticleCard article={lead} />
        <div className="divide-y divide-border rounded-xl border border-border bg-card px-4">
          {secondary.map((article, index) => <div key={article.id} className="flex items-start gap-3 py-3 first:pt-4 last:pb-4"><span className="pt-1 text-sm font-extrabold text-accent">{index + 2}</span><div className="min-w-0 flex-1"><CompactArticleRow article={article} /></div></div>)}
        </div>
      </div>
      <div className="mt-5 text-center"><Link to="/news" className="text-sm font-bold text-brand-blue underline underline-offset-4">Read more trending news</Link></div>
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
