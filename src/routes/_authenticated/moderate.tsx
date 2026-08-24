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
import { KENYA_COUNTIES, REPORT_SEVERITIES, NEWS_CATEGORIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/moderate")({
  head: () => ({
    meta: [
      { title: "Report Review Queue — Share Barabara" },
      {
        name: "description",
        content:
          "Editorial queue where moderators and admins review, edit and approve accident reports submitted by Kenyan road users.",
      },
      { property: "og:title", content: "Report Review Queue — Share Barabara" },
      {
        property: "og:description",
        content: "Approve, edit or reject community accident reports before publication.",
      },
    ],
  }),
  component: ModeratePage,
});

type ReportDraft = {
  title: string;
  description: string;
  county: string;
  road: string;
  severity: string;
  vehicles_involved: number;
  casualties: number;
  fatalities: number;
  editor_note: string;
};

type ArticleDraft = {
  title: string;
  summary: string;
  body: string;
  category: string;
};

function ModeratePage() {
  const { user } = useAuth();
  const { canReview, canPublishArticles, isLoading: rolesLoading } = useRoles();
  const [content, setContent] = useState<"reports" | "articles">("reports");

  if (rolesLoading) return <div className="mx-auto max-w-5xl px-4 py-10">Checking access…</div>;

  if (!canReview) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">Review queue</h1>
        <p className="mt-3 text-muted-foreground">
          This area is for moderators, editors and admins. If you should have access,
          ask an admin to grant you the moderator role.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Editorial
      </p>
      <h1 className="mt-2 text-4xl font-extrabold">Review queue</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Edit submissions for accuracy and clarity, then approve them. Published content
        is a collaboration between the person who submitted it and you.
      </p>

      <div className="mt-6 flex gap-2">
        {(["reports", "articles"] as const).map((c) => (
          <Button
            key={c}
            variant={content === c ? "default" : "outline"}
            onClick={() => setContent(c)}
            className="capitalize"
          >
            {c}
          </Button>
        ))}
      </div>

      {content === "reports" ? (
        <ReportsQueue userId={user?.id} />
      ) : (
        <ArticlesQueue userId={user?.id} canPublishArticles={canPublishArticles} />
      )}
    </div>
  );
}

function ReportsQueue({ userId }: { userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [drafts, setDrafts] = useState<Record<string, ReportDraft>>({});

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["review-reports", tab],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(reports.map((r) => r.user_id));

  const save = useMutation({
    mutationFn: async ({
      id,
      status,
      draft,
    }: {
      id: string;
      status: "approved" | "rejected" | "pending";
      draft?: ReportDraft;
    }) => {
      const patch = {
        status,
        reviewed_by: userId ?? null,
        reviewed_at: new Date().toISOString(),
        ...(draft ?? {}),
      };
      const { error } = await supabase.from("accident_reports").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report updated");
      queryClient.invalidateQueries({ queryKey: ["review-reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mt-6 flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <Button
            key={t}
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && reports.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing {tab} right now.
        </p>
      ) : null}

      <ul className="mt-6 space-y-6">
        {reports.map((r) => {
          const d: ReportDraft = drafts[r.id] ?? {
            title: r.title,
            description: r.description,
            county: r.county,
            road: r.road ?? "",
            severity: r.severity,
            vehicles_involved: r.vehicles_involved,
            casualties: r.casualties,
            fatalities: r.fatalities,
            editor_note: r.editor_note ?? "",
          };
          const set = (patch: Partial<ReportDraft>) =>
            setDrafts((prev) => ({ ...prev, [r.id]: { ...d, ...patch } }));

          return (
            <li key={r.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
              <p className="text-xs text-muted-foreground">
                Filed by <UserLink userId={r.user_id} name={names[r.user_id]} /> ·{" "}
                {longDate(r.occurred_at)}
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor={`t-${r.id}`}>Summary</Label>
                  <Input
                    id={`t-${r.id}`}
                    value={d.title}
                    onChange={(e) => set({ title: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>County</Label>
                    <Select value={d.county} onValueChange={(v) => set({ county: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {KENYA_COUNTIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`rd-${r.id}`}>Road or location</Label>
                    <Input
                      id={`rd-${r.id}`}
                      value={d.road}
                      onChange={(e) => set({ road: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={d.severity} onValueChange={(v) => set({ severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REPORT_SEVERITIES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor={`v-${r.id}`}>Vehicles</Label>
                      <Input
                        id={`v-${r.id}`}
                        type="number"
                        min={0}
                        value={d.vehicles_involved}
                        onChange={(e) => set({ vehicles_involved: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`i-${r.id}`}>Injured</Label>
                      <Input
                        id={`i-${r.id}`}
                        type="number"
                        min={0}
                        value={d.casualties}
                        onChange={(e) => set({ casualties: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`f-${r.id}`}>Deaths</Label>
                      <Input
                        id={`f-${r.id}`}
                        type="number"
                        min={0}
                        value={d.fatalities}
                        onChange={(e) => set({ fatalities: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor={`d-${r.id}`}>Report body</Label>
                  <Textarea
                    id={`d-${r.id}`}
                    rows={5}
                    value={d.description}
                    onChange={(e) => set({ description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`n-${r.id}`}>Editor's note (shown publicly)</Label>
                  <Textarea
                    id={`n-${r.id}`}
                    rows={2}
                    value={d.editor_note}
                    onChange={(e) => set({ editor_note: e.target.value })}
                    placeholder="Verification details, corrections or context added during review."
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: r.id, status: "approved", draft: d })}
                >
                  Approve &amp; publish
                </Button>
                <Button
                  variant="outline"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: r.id, status: r.status as never, draft: d })}
                >
                  Save edits
                </Button>
                <Button
                  variant="destructive"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: r.id, status: "rejected", draft: d })}
                >
                  Reject
                </Button>
                {r.status !== "pending" ? (
                  <Button
                    variant="ghost"
                    disabled={save.isPending}
                    onClick={() => save.mutate({ id: r.id, status: "pending" })}
                  >
                    Send back to pending
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ArticlesQueue({
  userId,
  canPublishArticles,
}: {
  userId: string | undefined;
  canPublishArticles: boolean;
}) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending_review" | "published" | "rejected" | "draft">(
    "pending_review",
  );
  const [drafts, setDrafts] = useState<Record<string, ArticleDraft>>({});

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["review-articles", tab],
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
        reviewed_by: userId ?? null,
        reviewed_at: new Date().toISOString(),
        ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
        ...(draft ?? {}),
      };
      const { error } = await supabase.from("news").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Article updated");
      queryClient.invalidateQueries({ queryKey: ["review-articles"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
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
          Moderators can see the article queue but only editors and admins can publish
          or reject an article.
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
                  <>Submitted by <UserLink userId={a.author_id} name={names[a.author_id]} /> · </>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {NEWS_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
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
    </>
  );
}
