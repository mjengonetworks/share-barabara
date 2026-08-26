import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { longDate } from "@/lib/format";
import { NEWS_CATEGORIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  head: () => ({ meta: [{ title: "Articles: Share Barabara Admin" }] }),
  component: ArticlesQueuePage,
});

type ArticleDraft = { title: string; summary: string; body: string; category: string };

function ArticlesQueuePage() {
  const { user } = useAuth();
  const { canPublishArticles } = useRoles();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending_review" | "published" | "rejected" | "draft">(
    "pending_review",
  );
  const [drafts, setDrafts] = useState<Record<string, ArticleDraft>>({});

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["admin-articles", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(
    articles.map((a) => a.author_id).filter((id): id is string => !!id),
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
        ...(draft ?? {}),
      };
      const { error } = await supabase.from("news").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article updated");
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
        Review submissions from contributors. Publishing or rejecting needs editor rank or above.
      </p>

      <div className="mt-6 flex gap-2">
        {(["pending_review", "published", "rejected", "draft"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t.replace("_", " ")}
          </Button>
        ))}
      </div>

      {!canPublishArticles ? (
        <p className="mt-4 rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Moderators can see the article queue but only editors and admins can publish or reject an
          article.
        </p>
      ) : null}

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && articles.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing here right now.
        </p>
      ) : null}

      <ul className="mt-6 space-y-6">
        {articles.map((a) => {
          const d: ArticleDraft = drafts[a.id] ?? {
            title: a.title,
            summary: a.summary,
            body: a.body,
            category: a.category,
          };
          const set = (patch: Partial<ArticleDraft>) =>
            setDrafts((prev) => ({ ...prev, [a.id]: { ...d, ...patch } }));

          return (
            <li key={a.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
              <p className="text-xs text-muted-foreground">
                {a.author_id ? (
                  <>
                    Submitted by <UserLink userId={a.author_id} name={names[a.author_id]} /> ·{" "}
                  </>
                ) : null}
                {longDate(a.created_at)}
              </p>

              {canPublishArticles ? (
                <div className="mt-4 space-y-4">
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
                        {NEWS_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                    <Textarea
                      id={`ab-${a.id}`}
                      rows={8}
                      value={d.body}
                      onChange={(e) => set({ body: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3">
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
                    onClick={() => save.mutate({ id: a.id, status: a.status as never, draft: d })}
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
