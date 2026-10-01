import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, History, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRoles";
import { useProfileNames } from "@/lib/profiles";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/feed")({
  head: () => ({ meta: [{ title: "Feed Moderation: Share Barabara Admin" }, { name: "robots", content: "noindex" }] }),
  component: FeedModerationPage,
});

type FeedPost = { id: string; author_id: string; body: string; status: string; moderation_status: string; moderation_reason: string | null; created_at: string };
type PostReport = { id: string; post_id: string; reporter_id: string; reason: string; status: string; created_at: string };
type CommentReport = { id: string; entity_id: string; user_id: string; message: string; status: string; created_at: string };
type CommentRow = { id: string; body: string; user_id: string; parent_comment_id: string | null; moderation_status: string; moderation_reason: string | null };

function FeedModerationPage() {
  const { canReview } = useRoles();
  const queryClient = useQueryClient();
  const postsQuery = useQuery<FeedPost[]>({
    queryKey: ["admin-feed-posts"], enabled: canReview,
    queryFn: async () => { const { data, error } = await (supabase.from("feed_posts") as any).select("id,author_id,body,status,moderation_status,moderation_reason,created_at").order("created_at", { ascending: false }).limit(200); if (error) throw error; return (data ?? []) as FeedPost[]; },
  });
  const postReportsQuery = useQuery<PostReport[]>({
    queryKey: ["admin-feed-post-reports"], enabled: canReview,
    queryFn: async () => { const { data, error } = await (supabase.from("feed_post_reports") as any).select("id,post_id,reporter_id,reason,status,created_at").order("created_at", { ascending: false }).limit(200); if (error) throw error; return (data ?? []) as PostReport[]; },
  });
  const commentReportsQuery = useQuery<CommentReport[]>({
    queryKey: ["admin-feed-comment-reports"], enabled: canReview,
    queryFn: async () => { const { data, error } = await supabase.from("content_requests").select("id,entity_id,user_id,message,status,created_at").eq("entity_type", "comment").eq("request_type", "report").order("created_at", { ascending: false }).limit(200); if (error) throw error; return (data ?? []) as CommentReport[]; },
  });
  const commentIds = (commentReportsQuery.data ?? []).map((report) => report.entity_id);
  const commentsQuery = useQuery<CommentRow[]>({
    queryKey: ["admin-feed-reported-comments", commentIds], enabled: canReview && commentIds.length > 0,
    queryFn: async () => { const { data, error } = await (supabase.from("comments") as any).select("id,body,user_id,parent_comment_id,moderation_status,moderation_reason").in("id", commentIds); if (error) throw error; return (data ?? []) as CommentRow[]; },
  });
  const historyQuery = useQuery({
    queryKey: ["admin-moderation-history"], enabled: canReview,
    queryFn: async () => { const { data, error } = await (supabase.from("moderation_action_history") as any).select("id,moderator_id,target_type,target_id,action,reason,created_at").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data ?? []; },
  });
  const posts = postsQuery.data ?? [];
  const postReports = postReportsQuery.data ?? [];
  const commentReports = commentReportsQuery.data ?? [];
  const comments = commentsQuery.data ?? [];
  const names = useProfileNames(Array.from(new Set([...posts.map((post) => post.author_id), ...postReports.map((report) => report.reporter_id), ...commentReports.map((report) => report.user_id), ...comments.map((comment) => comment.user_id)])));
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["admin-feed-posts"] }); queryClient.invalidateQueries({ queryKey: ["admin-feed-post-reports"] }); queryClient.invalidateQueries({ queryKey: ["admin-feed-comment-reports"] }); queryClient.invalidateQueries({ queryKey: ["admin-feed-reported-comments"] }); queryClient.invalidateQueries({ queryKey: ["admin-moderation-history"] }); queryClient.invalidateQueries({ queryKey: ["comments"] }); };
  const updatePost = useMutation({
    mutationFn: async ({ id, status, moderation_status, reason }: { id: string; status: string; moderation_status: string; reason: string }) => { const { error } = await (supabase.from("feed_posts") as any).update({ status, moderation_status, moderation_reason: reason, published_at: status === "published" ? new Date().toISOString() : null, moderated_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Feed post moderation updated"); refresh(); }, onError: (error: Error) => toast.error(error.message),
  });
  const updatePostReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "reviewed" | "dismissed" | "actioned" }) => { const { error } = await (supabase.from("feed_post_reports") as any).update({ status, reviewed_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: refresh, onError: (error: Error) => toast.error(error.message),
  });
  const updateCommentReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => { const { error } = await supabase.from("content_requests").update({ status, resolved_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: refresh, onError: (error: Error) => toast.error(error.message),
  });
  const updateComment = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "published" | "removed"; reason: string }) => { const { error } = await (supabase.from("comments") as any).update({ moderation_status: status, moderation_reason: reason, moderated_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Comment moderation updated"); refresh(); }, onError: (error: Error) => toast.error(error.message),
  });
  if (!canReview) return <p className="text-muted-foreground">Moderator access is required.</p>;
  return <div>
    <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Moderation queue</p>
    <h1 className="mt-1 text-2xl font-extrabold">Feed moderation</h1>{/* Remove / Reject actions preserve the legacy moderation vocabulary. */}
    <p className="mt-2 max-w-2xl text-muted-foreground">Review community posts, reported comments and nested replies. Every staff state change is recorded in the moderation history.</p>
    <section className="mt-6 space-y-4"><h2 className="flex items-center gap-2 text-lg font-bold"><MessageSquare className="size-5 text-accent" /> Posts</h2>{posts.map((post) => <article key={post.id} className="rounded-lg border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{names.data?.[post.author_id] ?? "Road user"}</p><p className="text-xs text-muted-foreground">{timeAgo(post.created_at)} · {post.moderation_status}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold">{post.status}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6">{post.body}</p>{post.moderation_reason ? <p className="mt-3 rounded bg-muted/50 p-3 text-xs text-muted-foreground">Moderation note: {post.moderation_reason}</p> : null}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => updatePost.mutate({ id: post.id, status: "published", moderation_status: "approved", reason: "Staff approved" })}>Publish / restore</Button><Button size="sm" variant="outline" onClick={() => updatePost.mutate({ id: post.id, status: "hidden", moderation_status: "needs_review", reason: "Held for review" })}>Hide for review</Button><Button size="sm" variant="destructive" onClick={() => updatePost.mutate({ id: post.id, status: "removed", moderation_status: "rejected", reason: "Removed by staff" })}>Remove</Button></div></article>)}{!postsQuery.isLoading && !posts.length ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No Feed posts found.</p> : null}</section>
    <section className="mt-10 space-y-4"><h2 className="flex items-center gap-2 text-lg font-bold"><Flag className="size-5 text-accent" /> Reported posts</h2>{postReports.map((report) => <article key={report.id} className="rounded-lg border border-border bg-card p-4"><p className="text-sm font-semibold">Reported by {names.data?.[report.reporter_id] ?? "member"} · <span className="text-muted-foreground">{report.status}</span></p><p className="mt-2 text-sm">{report.reason}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => updatePostReport.mutate({ id: report.id, status: "dismissed" })}>Dismiss report</Button><Button size="sm" variant="destructive" onClick={() => { updatePost.mutate({ id: report.post_id, status: "removed", moderation_status: "rejected", reason: report.reason }); updatePostReport.mutate({ id: report.id, status: "actioned" }); }}>Remove post</Button></div></article>)}{!postReports.length ? <p className="text-sm text-muted-foreground">No reported Feed posts.</p> : null}</section>
    <section className="mt-10 space-y-4"><h2 className="flex items-center gap-2 text-lg font-bold"><Flag className="size-5 text-accent" /> Reported comments and replies</h2>{commentReports.map((report) => { const comment = comments.find((item) => item.id === report.entity_id); return <article key={report.id} className="rounded-lg border border-border bg-card p-4"><p className="text-sm font-semibold">Reported by {names.data?.[report.user_id] ?? "member"} · <span className="text-muted-foreground">{report.status}</span></p><p className="mt-2 text-sm text-muted-foreground">Reason: {report.message}</p>{comment ? <><p className="mt-3 whitespace-pre-wrap text-sm">{comment.body}</p><p className="mt-1 text-xs text-muted-foreground">By {names.data?.[comment.user_id] ?? "member"}{comment.parent_comment_id ? " · nested reply" : " · top-level comment"} · {comment.moderation_status}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => updateCommentReport.mutate({ id: report.id, status: "dismissed" })}>Dismiss report</Button><Button size="sm" variant="destructive" onClick={() => { updateComment.mutate({ id: comment.id, status: "removed", reason: report.message }); updateCommentReport.mutate({ id: report.id, status: "resolved" }); }}>Remove comment</Button>{comment.moderation_status === "removed" ? <Button size="sm" onClick={() => updateComment.mutate({ id: comment.id, status: "published", reason: "Restored by staff" })}>Restore comment</Button> : null}</div></> : <p className="mt-3 text-sm text-muted-foreground">The reported comment is no longer available.</p>}</article>; })}{!commentReports.length ? <p className="text-sm text-muted-foreground">No reported comments or replies.</p> : null}</section>
    <section className="mt-10 space-y-4"><h2 className="flex items-center gap-2 text-lg font-bold"><History className="size-5 text-accent" /> Moderation history</h2>{historyQuery.error ? <p className="rounded border border-destructive/30 p-3 text-sm text-destructive">Moderation history is unavailable until the Task 49 migration is applied.</p> : null}<ul className="divide-y divide-border rounded-lg border border-border bg-card">{(historyQuery.data ?? []).slice(0, 30).map((entry: any) => <li key={entry.id} className="flex flex-wrap items-center gap-2 p-3 text-sm"><span className="font-semibold">{entry.action}</span><span className="text-muted-foreground">{entry.target_type} · {entry.target_id}</span><span className="ml-auto text-xs text-muted-foreground">{timeAgo(entry.created_at)}</span></li>)}{!historyQuery.isLoading && !historyQuery.error && !(historyQuery.data ?? []).length ? <li className="p-4 text-sm text-muted-foreground">No moderation actions recorded yet.</li> : null}</ul></section>
  </div>;
}
