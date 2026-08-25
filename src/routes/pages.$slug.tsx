import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Building2, Globe, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PageForm } from "@/components/site/page-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/pages/$slug")({
  head: () => ({
    meta: [
      { title: "Page: Share Barabara" },
      {
        name: "description",
        content: "An organisation profile on Share Barabara.",
      },
    ],
  }),
  component: PageProfile,
});

function PageProfile() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-4xl px-4 py-20 text-muted-foreground">Loading page…</p>;
  }

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <Link to="/pages" className="mt-4 inline-block underline">
          Back to pages
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === page.owner_id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
            <Building2 className="size-8" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              {page.category}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold">
              {page.name}
              {page.verified ? (
                <BadgeCheck className="size-6 text-accent" aria-label="Verified page" />
              ) : null}
            </h1>
          </div>
        </div>
        {isOwner ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit page
          </Button>
        ) : null}
      </div>

      {page.description ? (
        <p className="mt-6 max-w-2xl text-foreground/90">{page.description}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {page.county ? (
          <span className="flex items-center gap-1">
            <MapPin className="size-4" /> {page.county}
          </span>
        ) : null}
        {page.website_url ? (
          <a
            href={page.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            <Globe className="size-4" /> Website
          </a>
        ) : null}
        {page.phone ? (
          <a href={`tel:${page.phone}`} className="flex items-center gap-1 underline">
            <Phone className="size-4" /> {page.phone}
          </a>
        ) : null}
      </div>

      {!page.verified ? (
        <p className="mt-8 rounded border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          This page is not yet verified.{" "}
          <Link to="/subscribe" className="underline">
            Learn about Page verification
          </Link>
          .
        </p>
      ) : null}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit page</DialogTitle>
          </DialogHeader>
          <PageForm existing={page} onDone={() => setEditing(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
