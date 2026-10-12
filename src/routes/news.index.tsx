import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCanWriteArticles } from "@/hooks/useCanWriteArticles";
import { useNewsCategories } from "@/hooks/useTaxonomy";
import { Button } from "@/components/ui/button";
import { ArticleForm } from "@/components/site/article-form";
import { BannerAd } from "@/components/site/banner-ad";
import { PublicPageHero } from "@/components/site/public-page-hero";
import heroRoad from "@/assets/hero-road.jpg";
import { AdInterleave } from "@/components/site/ad-interleave";
import {
  CompactArticleCard,
  EditorialBand,
  EditorialCardSection,
  EditorialLeadAndRows,
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
};
const articleSelect =
  "id, slug, title, summary, category, source, published_at, featured, image_url";

function usePublishedQuery({
  name,
  category,
  limit = 12,
}: {
  name: string;
  category?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["news-task70", name, category, limit],
    queryFn: async () => {
      let query = supabase.from("news").select(articleSelect).eq("status", "published");
      if (category) query = query.eq("category", category);
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

function TopicSection({
  title,
  eyebrow,
  articles,
  tone = "plain",
  placement,
}: {
  title: string;
  eyebrow?: string;
  articles: ArticleCard[];
  tone?: "plain" | "pale";
  placement: string;
}) {
  if (!articles.length) return null;
  return (
    <EditorialBand tone={tone}>
      <SectionHeader eyebrow={eyebrow} title={title} to="/news" actionLabel="Read more" />
      <div className="mt-6">
        <EditorialLeadAndRows articles={articles.slice(0, 5)} placement={placement} />
      </div>
    </EditorialBand>
  );
}

function NewsIndex() {
  const { user } = useAuth();
  const canWrite = useCanWriteArticles();
  const { category } = Route.useSearch();
  const { data: categories = [] } = useNewsCategories();
  const [featuredLimit, setFeaturedLimit] = useState(6);
  const [trendingLimit, setTrendingLimit] = useState(6);
  const { data: filtered = [], isLoading: filteredLoading } = usePublishedQuery({
    name: "category",
    category,
    limit: 50,
  });
  const { data: latest = [] } = usePublishedQuery({ name: "latest", limit: 6 });
  const { data: all = [], isLoading: allLoading } = usePublishedQuery({ name: "all", limit: 50 });
  const { data: featured = [] } = useQuery({
    queryKey: ["news-task70-featured", featuredLimit],
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <PublicPageHero
        eyebrow="Share Barabara newsroom"
        title="News & Articles"
        description="Road safety reporting, transport insight and community stories about how Kenyans travel and how we can make every journey safer."
        image={heroRoad}
      />
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
                <EditorialCardSection articles={featured} />
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
              {categories.map((item) => (
                <Link
                  key={item.id}
                  to="/news"
                  search={{ category: item.name }}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-colors hover:border-accent hover:text-accent-foreground"
                >
                  {item.name}
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
          />
          <EditorialBand tone="plain">
            <SectionHeader
              eyebrow="Road context"
              title="Related Accident Reports"
              description="Published public reports that help place road-safety coverage in context."
              to="/reports"
              actionLabel="View reports"
            />
            {relatedReports.length ? (
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {relatedReports.map((report) => (
                  <ReportPreviewCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <EmptyState label="No approved public reports are available right now." />
            )}
          </EditorialBand>
          <EditorialBand tone="pale">
            <SectionHeader
              eyebrow="Live road context"
              title="Relevant Alerts"
              description="Only active alerts are shown here; resolved and expired alerts stay out of the current-news flow."
              to="/alerts"
              actionLabel="View alerts"
            />
            {relatedAlerts.length ? (
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {relatedAlerts.map((alert) => (
                  <AlertPreviewCard key={alert.id} alert={alert} />
                ))}
              </div>
            ) : (
              <EmptyState label="No active public alerts are available right now." />
            )}
            <div className="mt-8">
              <BannerAd placement="news-context-midpoint" />
            </div>
          </EditorialBand>
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
                <ArticleGridWithAds articles={all} placement="news-more" />
              </div>
            </div>
          </EditorialBand>
        </div>
      )}
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
