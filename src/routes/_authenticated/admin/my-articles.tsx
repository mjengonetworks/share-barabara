import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Newspaper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useCanWriteArticles } from "@/hooks/useCanWriteArticles";
import { ArticleForm } from "@/components/site/article-form";
import { dateTime } from "@/lib/format";
import { useNewsCategories } from "@/hooks/useTaxonomy";

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

type Draft = { title: string; summary: string; body: string; category: string; image_url: string };

function MyArticlesPage() {
  const { user } = useAuth();
  const { keepsArticleRightsAfterPublish } = useRoles();
  const canWrite = useCanWriteArticles();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useNewsCategories();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

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
    mutationFn: async ({
      id,
      status,
      draft,
    }: {
      id: string;
      status?: "draft" | "pending_review";
      draft?: Draft;
    }) => {
      const patch = {
        ...(draft
          ? {
              title: draft.title,
              summary: draft.summary,
              body: draft.body,
              category: draft.category,
              image_url: draft.image_url.trim() || null,
            }
          : {}),
        ...(status ? { status } : {}),
      };
      const { error } = await supabase.from("news").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
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
      <h1 className="mt-1 text-3xl font-extrabold">My articles</h1>
      <p className="mt-2 text-muted-foreground">
        Draft and submit articles for editorial review. Once an article is published, only
        authors-and-above keep edit or delete rights on it.
      </p>

      <div className="mt-6">
        {canWrite ? (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1.5 size-4" /> New article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>New article</DialogTitle>
              </DialogHeader>
              <ArticleForm onDone={() => setCreating(false)} />
            </DialogContent>
          </Dialog>
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
          const d: Draft = drafts[a.id] ?? {
            title: a.title,
            summary: a.summary,
            body: a.body,
            category: a.category,
            image_url: a.image_url ?? "",
          };
          const set = (patch: Partial<Draft>) =>
            setDrafts((prev) => ({ ...prev, [a.id]: { ...d, ...patch } }));

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
                    <span className="ml-auto text-xs text-muted-foreground">
                      {dateTime(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.category}</p>
                </div>
              </div>

              {editingId === a.id ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor={`t-${a.id}`}>Headline</Label>
                    <Input
                      id={`t-${a.id}`}
                      value={d.title}
                      onChange={(e) => set({ title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={d.category} onValueChange={(v) => set({ category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`img-${a.id}`}>Image URL</Label>
                    <Input
                      id={`img-${a.id}`}
                      value={d.image_url}
                      onChange={(e) => set({ image_url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`s-${a.id}`}>Summary</Label>
                    <Textarea
                      id={`s-${a.id}`}
                      rows={2}
                      value={d.summary}
                      onChange={(e) => set({ summary: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`b-${a.id}`}>Body</Label>
                    <RichTextEditor
                      id={`b-${a.id}`}
                      rows={8}
                      value={d.body}
                      onChange={(v) => set({ body: v })}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={save.isPending}
                      onClick={() => save.mutate({ id: a.id, draft: d })}
                    >
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingId(a.id)}>
                      Edit
                    </Button>
                  ) : null}
                  {a.status === "draft" ? (
                    <Button
                      size="sm"
                      disabled={save.isPending}
                      onClick={() => save.mutate({ id: a.id, status: "pending_review" })}
                    >
                      Submit for review
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(a.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
