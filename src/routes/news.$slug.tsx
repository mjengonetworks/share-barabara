import { useEffect, useRef } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Flame, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDateWithDay } from "@/lib/format";
import {
  useProfileNames,
  useProfileUsernames,
  useProfileAvatars,
  useProfileBylines,
} from "@/lib/profiles";
import { useRoleLabels, bylineLabel, roleRank, ROLE_RANK } from "@/hooks/useRoles";
import { UserLink } from "@/components/site/user-link";
import { UserAvatar } from "@/components/site/user-avatar";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";
import { ContentRequestActions } from "@/components/site/content-request-actions";
import { ShareBarabaraAI } from "@/components/site/share-barabara-ai";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { DiscoverySections } from "@/components/site/discovery-sections";
import { AlertPreviewCard, ReportPreviewCard } from "@/components/site/discovery-sections";
import { AdRichText } from "@/components/site/ad-interleave";
import { AdInterleave } from "@/components/site/ad-interleave";
import heroRoad from "@/assets/hero-road.jpg";
import {
  EditorialBand,
  PublicSidebar,
  SectionHeader,
  SidebarModule,
} from "@/components/site/public-layout";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    const { data, error: articleError } = await supabase
      .from("news")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (articleError) throw articleError;
    if (!data) throw notFound();
    const article = data;

    const [relatedResult, latestResult, trendingResult] = await Promise.all([
      supabase
        .from("news")
        .select("id, slug, title, category, image_url, published_at, source")
        .eq("category", article.category)
        .eq("status", "published")
        .neq("id", article.id)
        .order("published_at", { ascending: false })
        .limit(4),
      supabase
        .from("news")
        .select("id, slug, title, category, image_url, published_at, source")
        .eq("status", "published")
        .neq("id", article.id)
        .order("published_at", { ascending: false })
        .limit(8),
      supabase.rpc("trending_news", { hours_back: 48, result_limit: 6 }),
    ]);
    if (relatedResult.error) throw relatedResult.error;
    if (latestResult.error) throw latestResult.error;
    if (trendingResult.error) throw trendingResult.error;
    const related = relatedResult.data.length
      ? relatedResult.data
      : (latestResult.data ?? []).slice(0, 4);
    const relatedIds = new Set(related.map((item) => item.id));
    const latest = (latestResult.data ?? []).filter((item) => !relatedIds.has(item.id)).slice(0, 4);
    const trending = (trendingResult.data ?? [])
      .filter((item) => item.id !== article.id)
      .slice(0, 5);

    const [contextualReportsResult, contextualAlertsResult] = await Promise.all([
      article.road || article.county
        ? supabase
            .from("accident_reports")
            .select(
              "id, title, description, county, road, severity, occurred_at, image_url, vehicles_involved, casualties, fatalities",
            )
            .eq("status", "approved")
            .or(`road.eq.${article.road ?? ""},county.eq.${article.county ?? ""}`)
            .order("occurred_at", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: [], error: null }),
      article.road || article.county
        ? supabase
            .from("alerts")
            .select("id, title, description, county, road, hazard_type, severity, created_at")
            .eq("status", "active")
            .or(`road.eq.${article.road ?? ""},county.eq.${article.county ?? ""}`)
            .order("created_at", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (contextualReportsResult.error) throw contextualReportsResult.error;
    if (contextualAlertsResult.error) throw contextualAlertsResult.error;
    return {
      article,
      related,
      latest,
      trending,
      contextualReports: contextualReportsResult.data ?? [],
      contextualAlerts: contextualAlertsResult.data ?? [],
    };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article ?? loaderData;
    const title = article?.seo_title || article?.title || "News story";
    const description =
      article?.seo_description ||
      article?.summary ||
      "Read the full road safety story and join the community discussion.";
    return {
      meta: [
        { title: `${title}: Share Barabara Kenya` },
        { name: "description", content: description },
        ...(article?.seo_keywords ? [{ name: "keywords", content: article.seo_keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: NewsDetail,
});

type RelatedArticle = {
  id: string;
  slug: string;
  title: string;
  category?: string | null;
  image_url?: string | null;
  published_at?: string | null;
  source?: string | null;
};

function ArticleList({ articles }: { articles: RelatedArticle[] }) {
  return (
    <div className="mt-4 space-y-4">
      <AdInterleave
        items={articles}
        placement="article-sidebar"
        adClassName="pt-1"
        renderItem={(a, index) => (
          <Link
            key={a.id}
            to="/news/$slug"
            params={{ slug: a.slug }}
            className="group flex items-start gap-3 border-b border-border/70 py-3 first:pt-0 last:border-0 last:pb-0"
          >
            <span className="order-2 w-[38%] shrink-0 overflow-hidden rounded-md bg-muted">
              {a.image_url ? (
                <img
                  src={a.image_url}
                  alt=""
                  loading="lazy"
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <span className="flex aspect-video w-full items-center justify-center">
                  <Newspaper className="size-5 text-muted-foreground" aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="order-1 min-w-0 py-0.5">
              <span className="block line-clamp-2 text-sm font-bold leading-snug text-foreground group-hover:underline">
                {a.title}
              </span>
              <span className="mt-1 block truncate text-[0.68rem] font-semibold uppercase tracking-wide text-accent-foreground">
                {a.category ?? "News"}
                {a.source ? ` · ${a.source}` : ""}
              </span>
            </span>
          </Link>
        )}
      />
    </div>
  );
}

function NewsDetail() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const loaderArticle = loaderData.article;
  const { data: article, isLoading } = useQuery({
    queryKey: ["news", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderArticle,
  });

  const authorIds = article?.author_id ? [article.author_id] : [];
  const { data: authorNames = {} } = useProfileNames(authorIds);
  const { data: authorUsernames = {} } = useProfileUsernames(authorIds);
  const { data: authorAvatars = {} } = useProfileAvatars(authorIds);
  const { data: authorRoles = {} } = useRoleLabels(authorIds);
  const { data: authorBylines = {} } = useProfileBylines(authorIds);

  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!article || article.status !== "published" || recordedFor.current === article.id) return;
    recordedFor.current = article.id;
    void supabase.from("news_views").insert({ news_id: article.id }).then();
  }, [article]);

  const { data: related = [] } = useQuery({
    queryKey: ["news-related", article?.id, article?.category],
    enabled: !!article,
    initialData: loaderData.related,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category, image_url, published_at, source")
        .eq("category", article!.category)
        .eq("status", "published")
        .neq("id", article!.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      if (data.length > 0) return data;
      // Nothing else in this category yet — fall back to other recent
      // articles so "Related articles" is never empty.
      const fallback = await supabase
        .from("news")
        .select("id, slug, title, category, image_url, published_at, source")
        .neq("id", article!.id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(4);
      if (fallback.error) throw fallback.error;
      return fallback.data;
    },
  });

  const { data: latest = [] } = useQuery({
    queryKey: ["news-latest-sidebar", article?.id, related.map((r) => r.id)],
    enabled: !!article,
    initialData: loaderData.latest,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category, image_url, published_at, source")
        .neq("id", article!.id)
        .order("published_at", { ascending: false })
        .limit(5 + related.length);
      if (error) throw error;
      const relatedIds = new Set(related.map((r) => r.id));
      return data.filter((n) => !relatedIds.has(n.id)).slice(0, 4);
    },
  });

  const { data: trending = [] } = useQuery({
    queryKey: ["news-trending-sidebar", article?.id],
    enabled: !!article,
    initialData: loaderData.trending,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", {
        hours_back: 48,
        result_limit: 6,
      });
      if (error) throw error;
      return (data ?? []).filter((n) => n.id !== article!.id).slice(0, 5);
    },
  });

  const { data: contextualReports = [] } = useQuery({
    queryKey: ["news-context-reports", article?.id, article?.county, article?.road],
    enabled: !!article && Boolean(article.county || article.road),
    initialData: loaderData.contextualReports,
    queryFn: async () => {
      let query = supabase
        .from("accident_reports")
        .select(
          "id, title, description, county, road, severity, occurred_at, image_url, vehicles_involved, casualties, fatalities",
        )
        .eq("status", "approved");
      query = article!.road
        ? query.eq("road", article!.road)
        : query.eq("county", article!.county!);
      const { data, error } = await query.order("occurred_at", { ascending: false }).limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: contextualAlerts = [] } = useQuery({
    queryKey: ["news-context-alerts", article?.id, article?.county, article?.road],
    enabled: !!article && Boolean(article.county || article.road),
    initialData: loaderData.contextualAlerts,
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("id, title, description, county, road, hazard_type, severity, created_at")
        .eq("status", "active");
      query = article!.road
        ? query.eq("road", article!.road)
        : query.eq("county", article!.county!);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(4);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading story…</p>;
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-[1.155rem] font-bold">Story not found</h1>
        <Link to="/news" className="mt-4 inline-block underline">
          Back to News &amp; Articles
        </Link>
      </div>
    );
  }

  const readingMinutes = Math.max(
    1,
    Math.ceil(
      (article.body ?? "")
        .replace(/<[^>]+>/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean).length / 200,
    ),
  );

  return (
    <div className="w-full py-0 sm:py-2">
      <nav
        aria-label="Breadcrumb"
        className="bg-gradient-to-r from-brand-blue via-primary to-brand-blue text-primary-foreground"
      >
        <div className="mx-auto flex min-h-[38px] max-w-[1500px] items-center gap-1 overflow-hidden px-4 py-2 text-xs sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0 hover:underline">
            Home
          </Link>
          <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
          <Link to="/news" className="shrink-0 hover:underline">
            News &amp; Articles
          </Link>
          <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
          <Link
            to="/news"
            search={{ category: article.category }}
            className="shrink-0 hover:underline"
          >
            {article.category || "News"}
          </Link>
          <ChevronRight className="size-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate text-primary-foreground/80" aria-current="page">
            {article.title}
          </span>
        </div>
      </nav>
      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:px-8">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:p-6">
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(article.categories?.length ? article.categories : [article.category]).map((c) => (
              <Link
                key={c}
                to="/news"
                search={{ category: c }}
                className="inline-block rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-widest text-primary hover:border-accent hover:bg-primary/15"
              >
                {c}
              </Link>
            ))}
          </div>
          {article.status !== "published" ? (
            <p className="mt-4 rounded border border-dashed border-caution bg-caution/10 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-caution">
              Preview · {article.status.replace("_", " ")}, not visible to the public yet
            </p>
          ) : null}
          <div className="mt-4 border-b border-border/70 pb-4">
            <h1 className="max-w-4xl text-[28px] font-bold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[34px] lg:text-[clamp(34px,2.5vw,42px)]">
              {article.title}
            </h1>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {longDateWithDay(article.published_at)} · {readingMinutes} min read
            {article.source ? ` · ${article.source}` : ""}
          </p>
          <div className="mt-3">
            <ShareButtons title={article.title} />
          </div>
          {article.image_url ? (
            <figure className="mt-4">
              <img
                src={article.image_url}
                alt={article.image_alt || article.title}
                className="aspect-[16/8] w-full rounded-xl border border-border object-cover object-center"
              />
              {article.image_caption || article.image_credit ? (
                <figcaption className="mt-1.5 text-xs text-muted-foreground">
                  {article.image_caption}
                  {article.image_caption && article.image_credit ? " · " : ""}
                  {article.image_credit ? <em>Credit: {article.image_credit}</em> : null}
                </figcaption>
              ) : null}
            </figure>
          ) : (
            <figure className="mt-4">
              <img
                src={heroRoad}
                alt="Share Barabara road safety newsroom"
                className="aspect-[16/8] w-full rounded-xl border border-border object-cover object-center"
              />
              <figcaption className="mt-1.5 text-xs text-muted-foreground">
                Share Barabara newsroom
              </figcaption>
            </figure>
          )}
          {article.author_id ? (
            <div className="mt-4 flex items-start gap-3">
              <UserAvatar
                url={authorAvatars[article.author_id]}
                name={authorNames[article.author_id]}
                className="mt-0.5 size-11"
              />
              <div>
                <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                  By{" "}
                  <UserLink
                    userId={article.author_id}
                    name={authorNames[article.author_id]}
                    username={authorUsernames[article.author_id]}
                    staff={roleRank(authorRoles[article.author_id] ?? []) >= ROLE_RANK.moderator}
                    className="text-foreground"
                  />
                </p>
                <p className="mt-0.5 inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {bylineLabel(authorRoles[article.author_id], authorBylines[article.author_id])}
                </p>
              </div>
            </div>
          ) : null}
          {article.summary?.trim() ? (
            <p className="mt-5 rounded-lg border border-sky-200/80 bg-sky-50 px-4 py-3 text-lg text-primary">
              {article.summary}
            </p>
          ) : null}
          {article.status === "published" ? (
            <div className="mt-5">
              <BannerAd placement="article-quick-summary" />
            </div>
          ) : null}
          {article.status === "published" ? (
            <ShareBarabaraAI
              contextType="article"
              contextId={article.id}
              title={article.title}
              sourceText={`${article.summary ?? ""}\n${article.body ?? ""}`}
            />
          ) : null}
          <div className="mt-8 space-y-5 text-[1.05rem] leading-8 text-foreground/90 sm:text-[1.12rem]">
            <AdRichText content={article.body} placement="article-body" />
            {related[0] ? (
              <p className="mx-auto max-w-2xl rounded border-l-4 border-caution bg-caution/10 px-4 py-2 text-center text-sm">
                <span className="font-semibold">Read also: </span>
                <Link to="/news/$slug" params={{ slug: related[0].slug }} className="underline">
                  {related[0].title}
                </Link>
              </p>
            ) : null}
          </div>

          <ContentRequestActions
            entityType="news"
            entityId={article.id}
            ownerId={article.author_id}
          />

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tags
            </span>
            {(article.categories?.length ? article.categories : [article.category]).map((c) => (
              <Link
                key={c}
                to="/news"
                search={{ category: c }}
                className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium hover:border-accent hover:bg-accent/10 hover:text-accent-foreground"
              >
                {c}
              </Link>
            ))}
          </div>

          {related.length > 0 ? (
            <EditorialBand tone="plain" className="mt-10 rounded-xl border border-border/70">
              <SectionHeader
                eyebrow="Keep reading"
                title="Related articles"
                to="/news"
                actionLabel="More articles"
              />
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                {related.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to="/news/$slug"
                    params={{ slug: item.slug }}
                    className="group overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <span className="block overflow-hidden bg-muted">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="aspect-video w-full object-cover transition-transform group-hover:scale-[1.02]"
                        />
                      ) : (
                        <span className="flex aspect-video items-center justify-center">
                          <Newspaper className="size-7 text-muted-foreground" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="block p-3">
                      <span className="text-sm font-bold leading-snug text-brand-blue group-hover:underline">
                        {item.title}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </EditorialBand>
          ) : null}

          {contextualReports.length > 0 || contextualAlerts.length > 0 ? (
            <EditorialBand tone="pale" className="mt-10 rounded-xl">
              <SectionHeader
                eyebrow={
                  article.county || article.road
                    ? `Context for ${article.road || article.county}`
                    : "Road context"
                }
                title="Reports and alerts connected to this story"
                description="Public items matched by the article's stored road or county."
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {contextualReports.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-lg font-bold">Accident reports</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      {contextualReports.map((report) => (
                        <ReportPreviewCard key={report.id} report={report} />
                      ))}
                    </div>
                  </div>
                ) : null}
                {contextualAlerts.length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-lg font-bold">Active alerts</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      {contextualAlerts.map((alert) => (
                        <AlertPreviewCard key={alert.id} alert={alert} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </EditorialBand>
          ) : null}

          <CommentSection entityType="news" entityId={article.id} />
        </article>

        <PublicSidebar>
          <SidebarModule className="border-brand-blue/50 bg-gradient-to-br from-brand-blue via-primary to-brand-blue text-primary-foreground">
            <h2 className="text-center text-sm font-bold uppercase tracking-widest text-white">
              Stay informed
            </h2>
            <p className="mt-2 text-center text-sm text-primary-foreground/75">
              Get important road-safety stories and community updates in your inbox.
            </p>
            <NewsletterForm className="mt-4" variant="sidebar" />
          </SidebarModule>
          {related.length > 0 ? (
            <SidebarModule>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Related articles
              </h2>
              <ArticleList articles={related.slice(0, 4)} />
              <Link
                to="/news"
                search={{ category: article.category }}
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </SidebarModule>
          ) : null}
          {latest.length > 0 ? (
            <SidebarModule>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Latest articles
              </h2>
              <ArticleList articles={latest.slice(0, 4)} />
              <Link
                to="/news"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </SidebarModule>
          ) : null}
          {trending.length > 0 ? (
            <SidebarModule>
              <h2 className="flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                <Flame className="size-4 text-destructive" /> Trending
              </h2>
              <ArticleList articles={trending} />
              <Link
                to="/news"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </SidebarModule>
          ) : null}
          {contextualReports.length > 0 ? (
            <SidebarModule>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Related reports
              </h2>
              <div className="mt-4 space-y-4">
                {contextualReports.slice(0, 2).map((report) => (
                  <ReportPreviewCard key={report.id} report={report} />
                ))}
              </div>
            </SidebarModule>
          ) : null}
          {contextualAlerts.length > 0 ? (
            <SidebarModule>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Relevant alerts
              </h2>
              <div className="mt-4 space-y-4">
                {contextualAlerts.slice(0, 2).map((alert) => (
                  <AlertPreviewCard key={alert.id} alert={alert} />
                ))}
              </div>
            </SidebarModule>
          ) : null}
        </PublicSidebar>
      </div>
      <DiscoverySections focus="article" currentId={article.id} />
    </div>
  );
}
