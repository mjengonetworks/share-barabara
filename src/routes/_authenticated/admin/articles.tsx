import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  MoreVertical,
  Newspaper,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useProfileNames } from "@/lib/profiles";
import { useViewCounts } from "@/hooks/useViewCounts";
import { UserLink } from "@/components/site/user-link";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { dateTime } from "@/lib/format";
import { useNewsCategories } from "@/hooks/useTaxonomy";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  head: () => ({ meta: [{ title: "Articles: Share Barabara Admin" }] }),
  component: ArticlesQueuePage,
});

type ArticleDraft = {
  title: string;
  summary: string;
  body: string;
  category: string;
  image_alt: string;
  image_caption: string;
  image_credit: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
};
type Status = "draft" | "pending_review" | "published" | "rejected";

function ArticlesQueuePage() {
  const { user } = useAuth();
  const { canPublishArticles } = useRoles();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useNewsCategories();
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending_review");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ArticleDraft>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: allArticles = [], isLoading } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const articles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allArticles.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a.summary.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [allArticles, statusFilter, categoryFilter, search]);

  const { data: names = {} } = useProfileNames(
    articles.map((a) => a.author_id).filter((id): id is string => !!id),
  );
  const { data: viewCounts = {} } = useViewCounts(
    "news_views",
    "news_id",
    articles.map((a) => a.id),
  );

  const save = useMutation({
    mutationFn: async ({
      id,
      status,
      draft,
    }: {
      id: string;
      status: "published" | "rejected" | "pending_review";
      draft?: ArticleDraft;
    }) => {
      const patch = {
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
        ...(draft
          ? {
              ...draft,
              image_alt: draft.image_alt.trim() || null,
              image_caption: draft.image_caption.trim() || null,
              image_credit: draft.image_credit.trim() || null,
              seo_title: draft.seo_title.trim() || null,
              seo_description: draft.seo_description.trim() || null,
              seo_keywords: draft.seo_keywords.trim() || null,
            }
          : {}),
      };
      const { error } = await supabase.from("news").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article updated");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
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
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-articles"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Articles</h1>
      <p className="mt-2 text-muted-foreground">
        Review submissions from contributors. Publishing or rejecting needs moderator rank or above.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending_review">Pending review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
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
        <div className="min-w-48 flex-1">
          <Label htmlFor="article-search">Search</Label>
          <Input
            id="article-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or summary…"
          />
        </div>
      </div>

      {!canPublishArticles ? (
        <p className="mt-4 rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Only moderators, editors and admins can publish or reject an article submitted by someone
          else.
        </p>
      ) : null}

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && articles.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing matches these filters.
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {articles.map((a) => {
          const d: ArticleDraft = drafts[a.id] ?? {
            title: a.title,
            summary: a.summary,
            body: a.body,
            category: a.category,
            image_alt: a.image_alt ?? "",
            image_caption: a.image_caption ?? "",
            image_credit: a.image_credit ?? "",
            seo_title: a.seo_title ?? "",
            seo_description: a.seo_description ?? "",
            seo_keywords: a.seo_keywords ?? "",
          };
          const set = (patch: Partial<ArticleDraft>) =>
            setDrafts((prev) => ({ ...prev, [a.id]: { ...d, ...patch } }));
          const expanded = expandedId === a.id;

          return (
            <li key={a.id} className="rounded-lg border border-border bg-card card-elevated">
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {a.image_url ? (
                    <img
                      src={a.image_url}
                      alt=""
                      className="size-14 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
                      <Newspaper className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span className="rounded bg-accent/20 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-accent-foreground">
                        {a.category}
                      </span>
                      {a.author_id ? (
                        <>
                          · by <UserLink userId={a.author_id} name={names[a.author_id]} />
                        </>
                      ) : null}
                      <span className="inline-flex items-center gap-0.5">
                        · <Eye className="size-3" /> {viewCounts[a.id] ?? 0}
                      </span>
                      <span>· {dateTime(a.created_at)}</span>
                    </p>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/news/$slug" params={{ slug: a.slug }} target="_blank">
                        <ExternalLink className="mr-2 size-4" /> View on website
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setExpandedId(a.id)}>
                      <Pencil className="mr-2 size-4" /> Edit
                    </DropdownMenuItem>
                    {canPublishArticles && a.status !== "published" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: a.id, status: "published" })}
                      >
                        Publish
                      </DropdownMenuItem>
                    ) : null}
                    {canPublishArticles && a.status !== "rejected" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: a.id, status: "rejected" })}
                      >
                        Reject
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => remove.mutate(a.id)}
                    >
                      <Trash2 className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  aria-label={expanded ? "Collapse" : "Expand"}
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  className="shrink-0 text-muted-foreground"
                >
                  {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>

              {expanded ? (
                <div className="border-t border-border p-5">
                  {canPublishArticles ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`at-${a.id}`}>Headline</Label>
                        <Input
                          id={`at-${a.id}`}
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
                        <Label htmlFor={`as-${a.id}`}>Summary</Label>
                        <Textarea
                          id={`as-${a.id}`}
                          rows={2}
                          value={d.summary}
                          onChange={(e) => set({ summary: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ab-${a.id}`}>Article body</Label>
                        <RichTextEditor
                          id={`ab-${a.id}`}
                          rows={8}
                          value={d.body}
                          onChange={(v) => set({ body: v })}
                        />
                      </div>
                      <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Featured image details
                        </p>
                        <div>
                          <Label htmlFor={`aimg-alt-${a.id}`}>Alt text</Label>
                          <Input
                            id={`aimg-alt-${a.id}`}
                            value={d.image_alt}
                            onChange={(e) => set({ image_alt: e.target.value })}
                            placeholder="Describes the image for screen readers and search engines"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`aimg-cap-${a.id}`}>Caption</Label>
                            <Input
                              id={`aimg-cap-${a.id}`}
                              value={d.image_caption}
                              onChange={(e) => set({ image_caption: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`aimg-cred-${a.id}`}>Credit / source</Label>
                            <Input
                              id={`aimg-cred-${a.id}`}
                              value={d.image_credit}
                              onChange={(e) => set({ image_credit: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          SEO (optional, overrides defaults)
                        </p>
                        <div>
                          <Label htmlFor={`aseo-t-${a.id}`}>SEO title</Label>
                          <Input
                            id={`aseo-t-${a.id}`}
                            value={d.seo_title}
                            onChange={(e) => set({ seo_title: e.target.value })}
                            placeholder={a.title}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`aseo-d-${a.id}`}>SEO description</Label>
                          <Textarea
                            id={`aseo-d-${a.id}`}
                            rows={2}
                            value={d.seo_description}
                            onChange={(e) => set({ seo_description: e.target.value })}
                            placeholder={a.summary}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`aseo-k-${a.id}`}>SEO keywords</Label>
                          <Input
                            id={`aseo-k-${a.id}`}
                            value={d.seo_keywords}
                            onChange={(e) => set({ seo_keywords: e.target.value })}
                            placeholder="comma, separated, keywords"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>
                    </div>
                  )}

                  {canPublishArticles ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        disabled={save.isPending}
                        onClick={() => save.mutate({ id: a.id, status: "published", draft: d })}
                      >
                        Publish
                      </Button>
                      <Button
                        variant="outline"
                        disabled={save.isPending}
                        onClick={() =>
                          save.mutate({ id: a.id, status: a.status as never, draft: d })
                        }
                      >
                        Save edits
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={save.isPending}
                        onClick={() => save.mutate({ id: a.id, status: "rejected", draft: d })}
                      >
                        Reject
                      </Button>
                      {a.status !== "pending_review" ? (
                        <Button
                          variant="ghost"
                          disabled={save.isPending}
                          onClick={() => save.mutate({ id: a.id, status: "pending_review" })}
                        >
                          Send back to review
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
