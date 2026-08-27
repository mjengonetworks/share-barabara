import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageCategories } from "@/hooks/usePageCategories";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { usePageLeaderboard } from "@/hooks/useContributionLeaderboards";
import { Button } from "@/components/ui/button";
import { PageForm } from "@/components/site/page-form";
import { FeaturedPageCard } from "@/components/site/featured-cards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/pages/")({
  validateSearch: (search: Record<string, unknown>): { category?: string } => {
    const category =
      typeof search["category"] === "string" ? (search["category"] as string) : undefined;
    return category ? { category } : {};
  },
  head: () => ({
    meta: [
      { title: "Pages: Share Barabara" },
      {
        name: "description",
        content:
          "Organisations, saccos, driving schools and road safety advocates on Share Barabara.",
      },
    ],
  }),
  component: PagesIndex,
});

function PagesIndex() {
  const { user } = useAuth();
  const navigate = useNavigate({ from: Route.fullPath });
  const { category } = Route.useSearch();
  const { data: categories = [] } = usePageCategories();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["pages", category],
    queryFn: async () => {
      let query = supabase.from("pages").select("*").order("created_at", { ascending: false });
      if (category) query = query.eq("category", category);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Organisations
          </p>
          <h1 className="mt-2 text-[1.7325rem] font-extrabold">Pages</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Companies and organisations on Share Barabara — from driving schools and saccos to
            brands of any kind. A page works like a profile: it shows up wherever it has contributed
            alerts, reports, articles or comments.
          </p>
        </div>
        <CreatePageButton signedIn={!!user} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <FeaturedPageCard slot="pages_of_day" />
        <FeaturedPageCard slot="pages_of_week" />
      </div>

      <div className="mt-10">
        <Select
          value={category ?? "all"}
          onValueChange={(v) => navigate({ search: v === "all" ? {} : { category: v } })}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading pages…</p> : null}
      {!isLoading && pages.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          No pages yet{category ? ` in ${category}` : ""}.
        </p>
      ) : null}

      {category ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => (
            <PageCard key={p.id} page={p} />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {categories.map((c) => {
            const inCategory = pages.filter((p) => p.category === c.name);
            if (inCategory.length === 0) return null;
            return (
              <div key={c.id}>
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-[0.9625rem] font-bold">{c.name}</h2>
                  {inCategory.length > 5 ? (
                    <Link
                      to="/pages"
                      search={{ category: c.name }}
                      className="text-sm font-semibold text-brand-blue underline"
                    >
                      View more
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inCategory.slice(0, 5).map((p) => (
                    <PageCard key={p.id} page={p} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-14 grid gap-8 border-t border-border pt-10 lg:grid-cols-2">
        <PageLeaderboard title="Top contributing pages this week" days={7} />
        <PageLeaderboard title="Top contributing pages this month" days={30} />
      </div>
    </div>
  );
}

type PageRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description?: string | null;
  county?: string | null;
  verified: boolean;
};

function PageCard({ page: p }: { page: PageRow }) {
  return (
    <Link
      to="/pages/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col rounded-lg border border-border bg-card p-5 transition-shadow card-elevated hover:border-accent"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded bg-accent/20 text-accent-foreground">
          <Building2 className="size-5" />
        </span>
        <div>
          <p className="flex items-center gap-1 font-bold text-brand-blue group-hover:underline">
            {p.name}
            {p.verified ? (
              <BadgeCheck className="size-4 text-accent" aria-label="Verified page" />
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{p.category}</p>
        </div>
      </div>
      {p.description ? (
        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
      ) : null}
      {p.county ? <p className="mt-3 text-xs text-muted-foreground">{p.county}</p> : null}
    </Link>
  );
}

function PageLeaderboard({ title, days }: { title: string; days: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: ranked = [], isLoading } = usePageLeaderboard(days, expanded ? 20 : 5);
  const { data: pagesMap = {} } = usePagesByIds(ranked.map((r) => r.id));

  return (
    <div>
      <h2 className="flex items-center gap-2 text-[0.9625rem] font-bold">
        <Trophy className="size-5 text-accent" /> {title}
      </h2>
      {isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading…</p> : null}
      {!isLoading && ranked.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No contributions in this period yet.</p>
      ) : null}
      <ol className="mt-4 space-y-2">
        {ranked.map((r, i) => {
          const page = pagesMap[r.id];
          if (!page) return null;
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {i + 1}
                </span>
                <Link
                  to="/pages/$slug"
                  params={{ slug: page.slug }}
                  className="font-semibold text-brand-blue hover:underline"
                >
                  {page.name}
                </Link>
              </span>
              <span className="text-muted-foreground">{r.count} contributions</span>
            </li>
          );
        })}
      </ol>
      {!expanded && ranked.length >= 5 ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 text-sm font-semibold text-brand-blue underline"
        >
          View more
        </button>
      ) : null}
    </div>
  );
}

function CreatePageButton({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) {
    return (
      <Button asChild variant="outline">
        <Link to="/auth">Sign in to create a page</Link>
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create a page</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a page</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          For any organisation, big or small. Once created you can browse the site as your page from
          the profile menu, so anything you post is credited to it.
        </p>
        <PageForm />
      </DialogContent>
    </Dialog>
  );
}
