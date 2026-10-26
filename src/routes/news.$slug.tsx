import { Fragment, useEffect, useRef } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
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
import { ArticleShareToolbar } from "@/components/site/article-share-toolbar";
import { ShareBarabaraAI } from "@/components/site/share-barabara-ai";
import { renderRichText, splitRichTextBlocks } from "@/lib/richtext";
import { ArticleSidebar } from "@/components/site/article-detail-sidebar";
import { GlobalEditorialPreview } from "@/components/site/global-editorial-preview";
import { EditorialMediaMeta } from "@/components/site/editorial-media-meta";
import { EditorialSummary, ReadAlso } from "@/components/site/editorial-summary";
import heroRoad from "@/assets/hero-road.jpg";
import {
  publicEditorialCategoryBadgeClass,
  publicCategoryBadgeClass,
} from "@/components/site/public-ui";
import { socialHead } from "@/lib/seo";

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

    const [relatedResult, latestResult, trendingResult, categoriesResult] = await Promise.all([
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
      supabase.from("news").select("category, categories").eq("status", "published").limit(100),
    ]);
    if (relatedResult.error) throw relatedResult.error;
    if (latestResult.error) throw latestResult.error;
    if (trendingResult.error) throw trendingResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    const related = relatedResult.data?.length
      ? relatedResult.data
      : (latestResult.data ?? []).slice(0, 4);
    const relatedIds = new Set(related.map((item) => item.id));
    const latest = (latestResult.data ?? []).filter((item) => !relatedIds.has(item.id)).slice(0, 4);
    const trending = (trendingResult.data ?? [])
      .filter(
        (item) =>
          item.id !== article.id &&
          !relatedIds.has(item.id) &&
          !latest.some((latestItem) => latestItem.id === item.id),
      )
      .slice(0, 5);
    const categories = Array.from(
      new Set(
        (categoriesResult.data ?? [])
          .flatMap((item) => [
            item.category,
            ...(Array.isArray(item.categories) ? item.categories : []),
          ])
          .filter((value): value is string => Boolean(value?.trim())),
      ),
    ).sort((a, b) => a.localeCompare(b));

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
      categories,
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
    const head = socialHead({
      title,
      description,
      pathname: `/news/${article?.slug ?? ""}`,
      imageUrl: article?.image_url,
    });
    return {
      ...head,
      meta: [
        ...head.meta,
        ...(article?.seo_keywords ? [{ name: "keywords", content: article.seo_keywords }] : []),
      ],
    };
  },
  component: NewsDetail,
});

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

  const relatedIds = new Set(related.map((item) => item.id));
  const sidebarLatest = latest.filter((item) => !relatedIds.has(item.id));
  const latestIds = new Set(sidebarLatest.map((item) => item.id));
  const sidebarTrending = trending.filter(
    (item) => item.id !== article?.id && !relatedIds.has(item.id) && !latestIds.has(item.id),
  );

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
        <div className="mx-auto flex min-h-[38px] max-w-[1500px] items-center gap-1 overflow-hidden px-2 py-1 text-xs sm:px-6 lg:px-8">
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
      <div className="mx-auto grid max-w-[1500px] gap-4 px-2 py-1.5 sm:gap-5 sm:px-6 sm:py-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:px-8">
        <article className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-sm sm:rounded-2xl sm:p-3 lg:p-3">
          <div className="flex flex-wrap gap-1.5">
            {(article.categories?.length ? article.categories : [article.category]).map((c) => (
              <Link
                key={c}
                to="/news"
                search={{ category: c }}
                className={publicEditorialCategoryBadgeClass}
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
          <div className="mt-2 pb-2">
            <h1 className="max-w-4xl text-[22.4px] font-bold leading-[1.15] tracking-[-0.025em] text-foreground sm:text-[34px] lg:text-[clamp(34px,2.5vw,42px)]">
              {article.title}
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {longDateWithDay(article.published_at)} · {readingMinutes} min read
            {article.source ? ` · ${article.source}` : ""}
          </p>
          <div className="mt-3">
            <ArticleShareToolbar
              title={article.title}
              canonicalUrl={`https://sharebarabara.co.ke/news/${encodeURIComponent(article.slug)}`}
            />
          </div>
          {article.image_url ? (
            <figure className="mt-4">
              <img
                src={article.image_url}
                alt={article.image_alt || article.title}
                loading="lazy"
                className="aspect-video w-full rounded-xl border border-border object-cover object-center"
              />
              <EditorialMediaMeta caption={article.image_caption} credit={article.image_credit} />
            </figure>
          ) : (
            <figure className="mt-4">
              <img
                src={heroRoad}
                alt="Share Barabara road safety newsroom"
                loading="lazy"
                className="aspect-video w-full rounded-xl border border-border object-cover object-center"
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
            <EditorialSummary className="mt-5">{article.summary}</EditorialSummary>
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
          <ArticleBody content={article.body} related={related[0]} />

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tags
            </span>
            {(article.categories?.length ? article.categories : [article.category]).map((c) => (
              <Link
                key={c}
                to="/news"
                search={{ category: c }}
                className={publicCategoryBadgeClass}
              >
                {c}
              </Link>
            ))}
          </div>

          <CommentSection entityType="news" entityId={article.id} />
        </article>
        <ArticleSidebar
          related={related.slice(0, 4)}
          latest={sidebarLatest.slice(0, 4)}
          trending={sidebarTrending.slice(0, 5)}
          categories={loaderData.categories}
          contextualReports={contextualReports}
          contextualAlerts={contextualAlerts}
        />
      </div>
      <GlobalEditorialPreview
        destination="news"
        excludeId={article.id}
        category={article.category}
      />
    </div>
  );
}

function ArticleBody({
  content,
  related,
}: {
  content: string;
  related?: { slug: string; title: string };
}) {
  const blocks = splitRichTextBlocks(content);
  const readAlsoAfter =
    related && blocks.length >= 4 ? Math.max(1, Math.floor(blocks.length / 2)) : null;

  return (
    <div className="mt-8 space-y-5 text-[1.05rem] leading-8 text-foreground/90 sm:text-[1.12rem]">
      {blocks.map((block, index) => (
        <Fragment key={`article-body-${index}`}>
          {renderRichText(block)}
          {blocks.length > 1 && index + 1 === Math.floor(blocks.length / 2) ? (
            <div className="my-5">
              <BannerAd placement="article-body-mid" />
            </div>
          ) : null}
          {readAlsoAfter === index + 1 ? <ReadAlso related={related} /> : null}
        </Fragment>
      ))}
    </div>
  );
}
