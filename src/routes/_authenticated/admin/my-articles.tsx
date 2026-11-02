import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, MoreVertical, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { moveToRecycleBin } from "@/lib/recycle-bin.mjs";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useCanWriteArticles } from "@/hooks/useCanWriteArticles";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/my-articles")({
  head: () => ({ meta: [{ title: "My Articles: Share Barabara Admin" }] }),
  component: MyArticlesPage,
});

const STATUS_STYLE: Record<string, string> = {
  published: "bg-safe/15 text-safe",
  rejected: "bg-destructive/15 text-destructive",
  pending_review: "bg-caution/20 text-caution",
  draft: "bg-muted text-muted-foreground",
};

function MyArticlesPage() {
  const { user } = useAuth();
  const { keepsArticleRightsAfterPublish, canPublishArticles } = useRoles();
  const canWrite = useCanWriteArticles();
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-articles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async ({ id, status }: {
      id: string;
      status?: "draft" | "pending_review" | "published";
    }) => {
      const patch = {
        ...(status ? { status } : {}),
        ...(status === "published"
          ? {
              published_at: new Date().toISOString(),
              reviewed_by: user?.id ?? null,
              reviewed_at: new Date().toISOString(),
            }
          : {}),
      };
      const { error } = await supabase.from("news").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "published" ? "Article published" : "Saved");
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await moveToRecycleBin("article", id, "Removed by an administrator");
    },
    onSuccess: () => {
      toast.success("Article deleted");
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Admin
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">My articles</h1>
      <p className="mt-2 text-muted-foreground">
        Draft and submit articles for editorial review. Once an article is published, only
        authors-and-above keep edit or delete rights on it.
      </p>

      <div className="mt-6">
        {canWrite ? (
          <Button asChild>
            <Link to="/admin/my-articles/new"><Plus className="mr-1.5 size-4" /> New article</Link>
          </Button>
        ) : (
          <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Writing articles is a subscriber perk.{" "}
            <a href="/subscribe" className="underline">
              Subscribe
            </a>{" "}
            (or write as a verified page) to start drafting.
          </p>
        )}
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && articles.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          You haven't written anything yet.
        </p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {articles.map((a) => {
          const canEdit = a.status !== "published" || keepsArticleRightsAfterPublish;
          return (
            <li key={a.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
              <div className="flex items-center gap-3">
                {a.image_url ? (
                  <img src={a.image_url} alt="" className="size-12 shrink-0 rounded object-cover" />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                    <Newspaper className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[a.status] ?? ""}`}
                    >
                      {a.status.replace("_", " ")}
                    </span>
                    <span className="truncate font-semibold">{a.title}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(a.categories?.length ? a.categories : [a.category]).join(", ")}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {dateTime(a.created_at)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/news/$slug" params={{ slug: a.slug }} target="_blank">
                        <ExternalLink className="mr-2 size-4" />{" "}
                        {a.status === "published" ? "View on website" : "Preview"}
                      </Link>
                    </DropdownMenuItem>
                    {canEdit ? (
                      <DropdownMenuItem asChild>
                        <a href={`/admin/articles/${a.id}/edit`}><Pencil className="mr-2 size-4" /> Edit</a>
                      </DropdownMenuItem>
                    ) : null}
                    {canPublishArticles && a.status !== "published" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: a.id, status: "published" })}
                      >
                        Publish now
                      </DropdownMenuItem>
                    ) : null}
                    {canEdit && a.status === "published" ? (
                      <DropdownMenuItem onClick={() => save.mutate({ id: a.id, status: "draft" })}>
                        Unpublish (send back to draft)
                      </DropdownMenuItem>
                    ) : null}
                    {a.status === "draft" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: a.id, status: "pending_review" })}
                      >
                        Submit for review
                      </DropdownMenuItem>
                    ) : null}
                    {canEdit ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => remove.mutate(a.id)}
                        >
                          <Trash2 className="mr-2 size-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            </li>
          );
        })}
      </ul>
    </div>
  );
}
