import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";
import { CommentSection } from "@/components/site/comment-section";
import { BannerAd } from "@/components/site/banner-ad";

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

  const recordedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!article || recordedFor.current === article.id) return;
    recordedFor.current = article.id;
    void supabase.from("news_views").insert({ news_id: article.id });
  }, [article]);

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
    <article className="mx-auto max-w-3xl px-4 py-10">
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
      <p className="mt-3 text-sm text-muted-foreground">
        {longDate(article.published_at)} {article.source ? `· ${article.source}` : ""}
      </p>
      <p className="mt-6 border-l-4 border-accent pl-4 text-lg text-foreground/90">
        {article.summary}
      </p>
      <div className="mt-6 space-y-4 text-foreground/90">
        {article.body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <div className="mt-8">
        <BannerAd />
      </div>
      <CommentSection entityType="news" entityId={article.id} />
    </article>
  );
}