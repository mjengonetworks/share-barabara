import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { longDate } from "@/lib/format";
import { BannerAd } from "@/components/site/banner-ad";

export const Route = createFileRoute("/victims-focus")({
  head: () => ({
    meta: [
      { title: "Victims Focus: Share Barabara" },
      {
        name: "description",
        content: "Those we have lost and those still fighting: profiles, ambitions and the human cost of road crashes in Kenya.",
      },
    ],
  }),
  component: VictimsFocusPage,
});

function VictimsFocusPage() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["victims-focus-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, slug, title, summary, published_at, image_url")
        .eq("category", "Victims Focus")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Those we've lost
      </p>
      <h1 className="mt-2 flex items-center gap-3 text-4xl font-extrabold">
        <HeartHandshake className="size-9 text-accent" /> Victims Focus
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Behind every statistic is a person: their ambitions, their families, and for those who
        survived, the daily struggle of living with the consequences. This is a space to remember
        them and to hear from those still fighting.
      </p>

      <div className="mt-6">
        <BannerAd />
      </div>

      {isLoading ? <p className="mt-10 text-muted-foreground">Loading…</p> : null}
      {!isLoading && articles.length === 0 ? (
        <p className="mt-10 rounded border border-dashed border-border p-10 text-center text-muted-foreground">
          No profiles published yet.
        </p>
      ) : null}

      <ul className="mt-8 space-y-6">
        {articles.map((a) => (
          <li key={a.id}>
            <Link
              to="/news/$slug"
              params={{ slug: a.slug }}
              className="block rounded-lg border border-border bg-card p-6 transition-colors hover:border-accent card-elevated"
            >
              <h2 className="text-xl font-bold">{a.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{a.summary}</p>
              <p className="mt-3 text-xs text-muted-foreground">{longDate(a.published_at)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
