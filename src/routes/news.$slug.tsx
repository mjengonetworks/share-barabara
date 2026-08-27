import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDateWithDay } from "@/lib/format";
import {
  useProfileNames,
  useProfileUsernames,
  useProfileAvatars,
  useProfileBylines,
} from "@/lib/profiles";
import { useRoleLabels, bylineLabel, roleRank, ROLE_RANK } from "@/hooks/useRoles";
import { renderRichText } from "@/lib/richtext";
import { UserLink } from "@/components/site/user-link";
import { UserAvatar } from "@/components/site/user-avatar";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";
import { ContentRequestActions } from "@/components/site/content-request-actions";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("news").select("*").eq("slug", params.slug).maybeSingle();
    return data;
  },
  head: ({ loaderData }) => {
    const title = loaderData?.seo_title || loaderData?.title || "News story";
    const description =
      loaderData?.seo_description ||
      loaderData?.summary ||
      "Read the full road safety story and join the community discussion.";
    return {
      meta: [
        { title: `${title}: Share Barabara Kenya` },
        { name: "description", content: description },
        ...(loaderData?.seo_keywords
          ? [{ name: "keywords", content: loaderData.seo_keywords }]
          : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: NewsDetail,
});

type RelatedArticle = { id: string; slug: string; title: string; category: string };

function ArticleList({ articles }: { articles: RelatedArticle[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {articles.map((a) => (
        <li key={a.id}>
          <Link
            to="/news/$slug"
            params={{ slug: a.slug }}
            className="text-sm text-brand-blue hover:underline"
          >
            {a.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NewsDetail() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { data: article, isLoading } = useQuery({
    queryKey: ["news", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderData,
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category")
        .eq("category", article!.category)
        .neq("id", article!.id)
        .order("published_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (data.length > 0) return data;
      // Nothing else in this category yet — fall back to other recent
      // articles so "Related articles" is never empty.
      const fallback = await supabase
        .from("news")
        .select("id, slug, title, category")
        .neq("id", article!.id)
        .order("published_at", { ascending: false })
        .limit(5);
      if (fallback.error) throw fallback.error;
      return fallback.data;
    },
  });

  const { data: latest = [] } = useQuery({
    queryKey: ["news-latest-sidebar", article?.id, related.map((r) => r.id)],
    enabled: !!article,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, category")
        .neq("id", article!.id)
        .order("published_at", { ascending: false })
        .limit(5 + related.length);
      if (error) throw error;
      const relatedIds = new Set(related.map((r) => r.id));
      return data.filter((n) => !relatedIds.has(n.id)).slice(0, 5);
    },
  });

  const { data: trending = [] } = useQuery({
    queryKey: ["news-trending-sidebar", article?.id],
    enabled: !!article,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("trending_news", {
        hours_back: 48,
        result_limit: 6,
      });
      if (error) throw error;
      return (data ?? []).filter((n) => n.id !== article!.id).slice(0, 5);
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading story…</p>;
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-2xl font-bold">Story not found</h1>
        <Link to="/news" className="mt-4 inline-block underline">
          Back to news
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          <Link to="/news" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> All news
          </Link>
          <div className="mt-6 flex flex-wrap gap-2">
            {(article.categories?.length ? article.categories : [article.category]).map((c) => (
              <Link
                key={c}
                to="/news"
                search={{ category: c }}
                className="inline-block rounded bg-accent/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground hover:bg-accent/30"
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
          <h1 className="mt-3 text-4xl font-extrabold leading-tight">{article.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {longDateWithDay(article.published_at)} {article.source ? `· ${article.source}` : ""}
          </p>
          <div className="mt-3">
            <ShareButtons title={article.title} />
          </div>
          {article.image_url ? (
            <figure className="mt-4">
              <img
                src={article.image_url}
                alt={article.image_alt || article.title}
                className="aspect-video w-full rounded-lg border border-border object-cover"
              />
              {article.image_caption || article.image_credit ? (
                <figcaption className="mt-1.5 text-xs text-muted-foreground">
                  {article.image_caption}
                  {article.image_caption && article.image_credit ? " · " : ""}
                  {article.image_credit ? `Credit: ${article.image_credit}` : ""}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
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
          <p className="mt-6 border-l-4 border-accent pl-4 text-lg text-foreground/90">
            {article.summary}
          </p>
          <div className="mt-6 space-y-4 text-foreground/90">
            {renderRichText(article.body)}
            {related[0] ? (
              <p className="rounded border-l-4 border-caution bg-caution/10 py-2 pl-4 text-sm">
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
                className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent-foreground"
              >
                {c}
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <BannerAd />
          </div>
          <CommentSection entityType="news" entityId={article.id} />
        </article>

        <aside className="space-y-8">
          {related.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Related articles
              </h2>
              <ArticleList articles={related} />
              <Link
                to="/news"
                search={{ category: article.category }}
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
          {latest.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Latest articles
              </h2>
              <ArticleList articles={latest} />
              <Link
                to="/news"
                className="mt-4 inline-block text-sm font-semibold text-brand-blue underline"
              >
                Read more
              </Link>
            </div>
          ) : null}
          {trending.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-5 card-elevated">
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
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
