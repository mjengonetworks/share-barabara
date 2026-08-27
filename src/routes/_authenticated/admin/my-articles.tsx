import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, MoreVertical, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { ImageUploadField } from "@/components/site/image-upload-field";
import { CategoryMultiSelect } from "@/components/site/category-multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type Draft = {
  title: string;
  summary: string;
  body: string;
  categories: string[];
  image_url: string;
  image_alt: string;
  image_caption: string;
  image_credit: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
};

function MyArticlesPage() {
  const { user } = useAuth();
  const { keepsArticleRightsAfterPublish, canPublishArticles, canEditSeo } = useRoles();
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
      status?: "draft" | "pending_review" | "published";
      draft?: Draft;
    }) => {
      const patch = {
        ...(draft
          ? {
              title: draft.title,
              summary: draft.summary,
              body: draft.body,
              category: draft.categories[0] ?? "News",
              categories: draft.categories,
              image_url: draft.image_url.trim() || null,
              image_alt: draft.image_alt.trim() || null,
              image_caption: draft.image_caption.trim() || null,
              image_credit: draft.image_credit.trim() || null,
              ...(canEditSeo
                ? {
                    seo_title: draft.seo_title.trim() || null,
                    seo_description: draft.seo_description.trim() || null,
                    seo_keywords: draft.seo_keywords.trim() || null,
                  }
                : {}),
            }
          : {}),
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
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-articles"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
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
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">My articles</h1>
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
            categories: a.categories?.length ? a.categories : [a.category],
            image_url: a.image_url ?? "",
            image_alt: a.image_alt ?? "",
            image_caption: a.image_caption ?? "",
            image_credit: a.image_credit ?? "",
            seo_title: a.seo_title ?? "",
            seo_description: a.seo_description ?? "",
            seo_keywords: a.seo_keywords ?? "",
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
                      <DropdownMenuItem onClick={() => setEditingId(a.id)}>
                        <Pencil className="mr-2 size-4" /> Edit
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
                    <Label>Categories</Label>
                    <div className="mt-2">
                      <CategoryMultiSelect
                        categories={categories}
                        value={d.categories}
                        onChange={(v) => set({ categories: v })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Featured image</Label>
                    <div className="mt-2 space-y-2">
                      <ImageUploadField
                        value={d.image_url}
                        onChange={(url) => set({ image_url: url })}
                      />
                      {canEditSeo ? (
                        <>
                          <Input
                            value={d.image_alt}
                            onChange={(e) => set({ image_alt: e.target.value })}
                            placeholder="Alt text (describes the image for screen readers and search engines)"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              value={d.image_caption}
                              onChange={(e) => set({ image_caption: e.target.value })}
                              placeholder="Caption (optional)"
                            />
                            <Input
                              value={d.image_credit}
                              onChange={(e) => set({ image_credit: e.target.value })}
                              placeholder="Credit / source (optional)"
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
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
                      rows={16}
                      value={d.body}
                      onChange={(v) => set({ body: v })}
                    />
                  </div>
                  {canEditSeo ? (
                    <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        SEO (optional, overrides defaults)
                      </p>
                      <div>
                        <Label htmlFor={`seo-t-${a.id}`}>SEO title</Label>
                        <Input
                          id={`seo-t-${a.id}`}
                          value={d.seo_title}
                          onChange={(e) => set({ seo_title: e.target.value })}
                          placeholder={a.title}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`seo-d-${a.id}`}>SEO description</Label>
                        <Textarea
                          id={`seo-d-${a.id}`}
                          rows={2}
                          value={d.seo_description}
                          onChange={(e) => set({ seo_description: e.target.value })}
                          placeholder={a.summary}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`seo-k-${a.id}`}>SEO keywords</Label>
                        <Input
                          id={`seo-k-${a.id}`}
                          value={d.seo_keywords}
                          onChange={(e) => set({ seo_keywords: e.target.value })}
                          placeholder="comma, separated, keywords"
                        />
                      </div>
                    </div>
                  ) : null}
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
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
