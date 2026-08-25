import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageCategories } from "@/hooks/usePageCategories";
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
          <h1 className="mt-2 text-4xl font-extrabold">Pages</h1>
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

      <div className="mt-10 flex flex-wrap gap-2">
        <Link
          to="/pages"
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            !category
              ? "border-accent bg-accent/15 text-accent-foreground"
              : "border-border bg-card hover:border-accent hover:text-accent-foreground"
          }`}
        >
          All categories
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/pages"
            search={{ category: c.name }}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              category === c.name
                ? "border-accent bg-accent/15 text-accent-foreground"
                : "border-border bg-card hover:border-accent hover:text-accent-foreground"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading pages…</p> : null}
      {!isLoading && pages.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          No pages yet{category ? ` in ${category}` : ""}.
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((p) => (
          <Link
            key={p.id}
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
        ))}
      </div>
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
