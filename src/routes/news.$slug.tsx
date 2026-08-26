import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";
import { useProfileNames, useProfileUsernames } from "@/lib/profiles";
import { useRoleLabels, primaryRoleLabel } from "@/hooks/useRoles";
import { renderRichText } from "@/lib/richtext";
import { UserLink } from "@/components/site/user-link";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";
import { ShareButtons } from "@/components/site/share-buttons";
import { ContentRequestActions } from "@/components/site/content-request-actions";

export const Route = createFileRoute("/news/$slug")({
  head: () => ({
    meta: [
      { title: "News story: Share Barabara Kenya" },
      {
        name: "description",
        content: "Read the full road safety story and join the community discussion.",
      },
      { property: "og:title", content: "Road safety story: Share Barabara Kenya" },
      {
        property: "og:description",
        content: "Read the full road safety story and join the community discussion.",
      },
    ],
  }),
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
  });

  const authorIds = article?.author_id ? [article.author_id] : [];
  const { data: authorNames = {} } = useProfileNames(authorIds);
  const { data: authorUsernames = {} } = useProfileUsernames(authorIds);
  const { data: authorRoles = {} } = useRoleLabels(authorIds);

  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!article || recordedFor.current === article.id) return;
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
      return data;
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
          <Link
            to="/news"
            search={{ category: article.category }}
            className="mt-6 inline-block rounded bg-accent/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-accent-foreground hover:bg-accent/30"
          >
            {article.category}
          </Link>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight">{article.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {article.author_id ? (
              <>
                By{" "}
                <UserLink
                  userId={article.author_id}
                  name={authorNames[article.author_id]}
                  username={authorUsernames[article.author_id]}
                  className="text-foreground"
                />
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {primaryRoleLabel(authorRoles[article.author_id])}
                </span>
                {" · "}
              </>
            ) : null}
            {longDate(article.published_at)} {article.source ? `· ${article.source}` : ""}
          </p>
          <div className="mt-3">
            <ShareButtons title={article.title} />
          </div>
          {article.image_url ? (
            <img
              src={article.image_url}
              alt={article.title}
              className="mt-6 aspect-video w-full rounded-lg border border-border object-cover"
            />
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
            <Link
              to="/news"
              search={{ category: article.category }}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-accent hover:text-accent-foreground"
            >
              {article.category}
            </Link>
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
