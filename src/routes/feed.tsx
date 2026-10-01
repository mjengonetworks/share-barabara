import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Hash, MessageSquare, Send, ShieldAlert, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames, useProfileUsernames } from "@/lib/profiles";
import { useVotes } from "@/hooks/useVotes";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { useRoles } from "@/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VoteButtons } from "@/components/site/vote-buttons";
import { CommentSection } from "@/components/site/comment-section";
import { UserLink } from "@/components/site/user-link";
import { timeAgo } from "@/lib/format";
import { FEED_LIMIT, feedSort, normalizeFeedBody, trendCounts } from "@/lib/feed.mjs";
import { createFeedPost } from "@/lib/feed.functions";

export const Route = createFileRoute("/feed")({
  head: () => ({ meta: [{ title: "Feed: Share Barabara" }, { name: "description", content: "A public conversation about safer roads, transport and community issues in Kenya." }] }),
  validateSearch: (search: Record<string, unknown>) => ({ sort: search.sort === "popular" || search.sort === "trending" ? search.sort : "latest" }),
  component: FeedPage,
});

type Post = { id: string; author_id: string; body: string; hashtags: string[]; status: string; moderation_status: string; created_at: string; published_at: string | null; score?: number; comment_count?: number };
type AutoItem = { id: string; kind: "alert" | "report" | "article"; title: string; body: string; created_at: string; location?: string | null; href: string };

function FeedPage() {
  const { user } = useAuth();
  const { rank } = useRoles();
  const queryClient = useQueryClient();
  const { sort = "latest" } = Route.useSearch();
  const [body, setBody] = useState("");
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");

  const { data: posts = [], isLoading, error: feedError } = useQuery<Post[]>({
    queryKey: ["feed-posts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("feed_posts") as any).select("id,author_id,body,hashtags,status,moderation_status,created_at,published_at").order("created_at", { ascending: false }).limit(FEED_LIMIT);
      if (error) {
        const setupError = error.code === "42P01" || error.code === "PGRST205";
        throw new Error(setupError ? "Feed storage is not enabled yet." : "The community Feed is temporarily unavailable.");
      }
      return (data ?? []) as Post[];
    },
    staleTime: 30_000,
  });

  const { data: automatic = [] } = useQuery<AutoItem[]>({
    queryKey: ["feed-automatic-content"],
    queryFn: async () => {
      const [alerts, reports, articles] = await Promise.all([
        supabase.from("alerts").select("id,title,description,county,road,created_at").eq("status", "active").order("created_at", { ascending: false }).limit(8),
        supabase.from("accident_reports").select("id,title,description,county,road,occurred_at").eq("status", "approved").order("occurred_at", { ascending: false }).limit(8),
        supabase.from("news").select("id,slug,title,summary,published_at").eq("status", "published").order("published_at", { ascending: false }).limit(8),
      ]);
      return [
        ...(alerts.data ?? []).map((item) => ({ id: item.id, kind: "alert" as const, title: item.title, body: item.description, location: [item.county, item.road].filter(Boolean).join(" · "), created_at: item.created_at, href: `/alerts/${item.id}` })),
        ...(reports.data ?? []).map((item) => ({ id: item.id, kind: "report" as const, title: item.title, body: item.description, location: [item.county, item.road].filter(Boolean).join(" · "), created_at: item.occurred_at, href: `/reports/${item.id}` })),
        ...(articles.data ?? []).map((item) => ({ id: item.id, kind: "article" as const, title: item.title, body: item.summary, created_at: item.published_at, href: `/news/${item.slug}` })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12);
    },
    staleTime: 60_000,
  });

  const postIds = posts.map((post) => post.id);
  const { scores, vote } = useVotes("feed_post", postIds);
  const { data: commentRows = [] } = useQuery<{ entity_id: string }[]>({
    queryKey: ["feed-comment-counts", postIds],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from("comments") as any).select("entity_id").eq("entity_type", "feed_post").in("entity_id", postIds);
      return (data ?? []) as { entity_id: string }[];
    },
  });
  const enriched = posts.map((post) => ({ ...post, score: scores[post.id]?.net ?? 0, comment_count: commentRows.filter((comment) => comment.entity_id === post.id).length }));
  const sortedPosts = feedSort(enriched, sort);
  const allNamesIds = sortedPosts.map((post) => post.author_id);
  const { data: names = {} } = useProfileNames(allNamesIds);
  const { data: usernames = {} } = useProfileUsernames(allNamesIds);
  const { data: verified = {} } = useSubscriptionStatuses(allNamesIds);
  const trends = trendCounts(posts);
  const { data: blockedRows = [] } = useQuery<{ blocked_id: string }[]>({
    queryKey: ["feed-blocks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase.from("feed_blocks") as any).select("blocked_id").eq("blocker_id", user!.id);
      return (data ?? []) as { blocked_id: string }[];
    },
    staleTime: 30_000,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to post");
      const clean = normalizeFeedBody(body);
      if (clean.length < 3) throw new Error("Write at least three characters");
      await createFeedPost({ data: { body: clean } });
    },
    onSuccess: () => { setBody(""); toast.success("Posted for community review"); queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const report = useMutation({
    mutationFn: async () => {
      if (!user || !reportTarget) throw new Error("Sign in to report a post");
      const reason = normalizeFeedBody(reportReason);
      if (reason.length < 3) throw new Error("Add a short reason");
      const { error } = await (supabase.from("feed_post_reports") as any).insert({ post_id: reportTarget, reporter_id: user.id, reason });
      if (error) throw error;
    },
    onSuccess: () => { setReportTarget(null); setReportReason(""); toast.success("Reported to the moderation team"); },
    onError: (error: Error) => toast.error(error.message),
  });
  const block = useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("Sign in to block a member");
      const { error } = await (supabase.from("feed_blocks") as any).insert({ blocker_id: user.id, blocked_id: blockedId });
      if (error) throw error;
      return blockedId;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["feed-blocks", user?.id] }); queryClient.invalidateQueries({ queryKey: ["blocked-accounts", user?.id] }); queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); toast.success("Member hidden from your Feed"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const blocked = useMemo(() => new Set(blockedRows.map((row) => row.blocked_id)), [blockedRows]);
  const visiblePosts = sortedPosts.filter((post) => !blocked.has(post.author_id));

  return <div className="mx-auto max-w-6xl px-4 py-8">
    <header className="mb-8"><p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Community conversation</p><h1 className="mt-1 text-3xl font-extrabold">Share Barabara Feed</h1><p className="mt-2 max-w-2xl text-muted-foreground">Road users, contributors and the Share Barabara newsroom discussing safer roads, transport and the infrastructure around us.</p></header>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <main className="min-w-0">
        {user ? <section className="rounded-lg border border-border bg-card p-5 card-elevated"><div className="flex items-center gap-2"><Send className="size-5 text-accent" /><h2 className="font-bold">Start a conversation</h2></div><Textarea className="mt-4" rows={4} maxLength={4000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What are road users seeing, discussing or learning today? Use #topics to help people discover it." /><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Posts are reviewed for safety and community standards before publication.</span><Button disabled={submit.isPending || body.trim().length < 3} onClick={() => submit.mutate()}>{submit.isPending ? "Posting…" : "Post"}</Button></div></section> : <section className="rounded-lg border border-dashed border-border bg-muted/30 p-5"><p className="font-semibold">Join the conversation</p><p className="mt-1 text-sm text-muted-foreground"><Link to="/auth" className="font-semibold underline">Sign in</Link> to create posts, vote and reply. Everyone can read the public Feed.</p></section>}
        <div className="mt-7 flex flex-wrap items-center gap-2 border-b border-border pb-4"><span className="mr-2 text-sm font-semibold">Sort:</span>{(["latest", "popular", "trending"] as const).map((value) => <Link key={value} to="/feed" search={{ sort: value }} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${sort === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{value === "trending" ? <TrendingUp className="mr-1 inline size-4" /> : null}{value[0].toUpperCase() + value.slice(1)}</Link>)}</div>
        {isLoading ? <p className="mt-6 text-muted-foreground">Loading community posts…</p> : null}
        {feedError ? <div role="alert" className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><p className="font-semibold">Community posts are unavailable</p><p className="mt-1">{feedError.message} You can still browse the public Share Barabara updates below.</p></div> : null}
        <div className="mt-6 space-y-5">{visiblePosts.map((post) => <article key={post.id} className="rounded-lg border border-border bg-card p-5 card-elevated"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><UserLink userId={post.author_id} name={names[post.author_id]} username={usernames[post.author_id]} verified={!!verified[post.author_id]} /><span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span></div><span className="text-xs text-muted-foreground">{post.status === "published" ? "Community post" : "Awaiting review"}</span></div><p className="mt-4 whitespace-pre-wrap text-[0.98rem] leading-7">{post.body}</p>{post.hashtags?.length ? <div className="mt-3 flex flex-wrap gap-2">{post.hashtags.map((tag) => <span key={tag} className="text-xs font-semibold text-brand-blue">#{tag}</span>)}</div> : null}<div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3"><VoteButtons net={post.score ?? 0} mine={scores[post.id]?.mine ?? 0} onVote={(value) => vote(post.id, value)} /><button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}><MessageSquare className="size-4" /> {post.comment_count ?? 0} discussion{post.comment_count === 1 ? "" : "s"}</button>{user && post.author_id !== user.id ? <><button type="button" className="text-xs font-semibold text-muted-foreground hover:text-destructive" onClick={() => setReportTarget(post.id)}><ShieldAlert className="mr-1 inline size-4" /> Report</button><button type="button" className="text-xs font-semibold text-muted-foreground hover:text-destructive" onClick={() => block.mutate(post.author_id)}>Block</button></> : null}</div>{selectedPost === post.id ? <CommentSection entityType="feed_post" entityId={post.id} /> : null}</article>)}</div>
        <section className="mt-10"><div className="mb-4 flex items-center gap-2"><Flame className="size-5 text-accent" /><h2 className="text-xl font-bold">From Share Barabara</h2></div><div className="space-y-3">{automatic.map((item) => <a key={`${item.kind}-${item.id}`} href={item.href} className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-accent"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-accent-foreground">{item.kind === "article" ? "News & Articles" : item.kind === "alert" ? "Active alert" : "Approved report"}</span><span className="text-xs text-muted-foreground">{timeAgo(item.created_at)}</span></div><h3 className="mt-2 font-bold">{item.title}</h3>{item.location ? <p className="mt-1 text-xs text-muted-foreground">{item.location}</p> : null}<p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.body}</p></a>)}</div></section>
      </main>
      <aside className="space-y-5"><section className="rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-2"><Hash className="size-5 text-accent" /><h2 className="font-bold">Trending topics</h2></div>{trends.length ? <ul className="mt-4 space-y-3">{trends.map((trend) => <li key={trend.tag} className="flex items-center justify-between gap-3"><span className="font-semibold text-brand-blue">#{trend.tag}</span><span className="text-xs text-muted-foreground">{trend.count} post{trend.count === 1 ? "" : "s"}</span></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">Topics will appear as the community posts and discusses.</p>}</section><section className="rounded-lg border border-border bg-card p-5"><h2 className="font-bold">Community standards</h2><p className="mt-2 text-sm text-muted-foreground">Keep reports factual, protect people’s privacy, and do not share dangerous instructions or unverified accusations. Moderators may hide content while reviewing reports.</p>{rank >= 3 ? <Link to="/admin/comments" className="mt-3 inline-block text-sm font-semibold text-brand-blue underline">Open moderation tools</Link> : null}</section></aside>
    </div>
    <Dialog open={!!reportTarget} onOpenChange={(open) => { if (!open) setReportTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Report Feed post</DialogTitle></DialogHeader><Textarea rows={4} value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="Tell moderators what needs attention" /><Button variant="destructive" disabled={report.isPending || reportReason.trim().length < 3} onClick={() => report.mutate()}>{report.isPending ? "Sending…" : "Send report"}</Button></DialogContent></Dialog>
  </div>;
}
