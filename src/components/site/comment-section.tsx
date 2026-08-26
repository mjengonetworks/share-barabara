import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveIdentity } from "@/hooks/useActiveIdentity";
import { useVotes } from "@/hooks/useVotes";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import { usePagesByIds } from "@/hooks/usePagesByIds";
import { useProfileNames, useProfileUsernames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { VoteButtons } from "@/components/site/vote-buttons";
import { timeAgo } from "@/lib/format";

type Props = { entityType: "news" | "alert" | "report"; entityId: string };

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  page_id: string | null;
  parent_comment_id: string | null;
};

export function CommentSection({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const { identity } = useActiveIdentity();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const key = ["comments", entityType, entityId];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, created_at, user_id, page_id, parent_comment_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CommentRow[];
    },
  });

  const { data: names = {} } = useProfileNames(comments.map((c) => c.user_id));
  const { data: usernames = {} } = useProfileUsernames(comments.map((c) => c.user_id));
  const { data: verified = {} } = useSubscriptionStatuses(comments.map((c) => c.user_id));
  const { data: pages = {} } = usePagesByIds(comments.map((c) => c.page_id));
  const { scores, vote } = useVotes(
    "comment",
    comments.map((c) => c.id),
  );

  const post = useMutation({
    mutationFn: async ({ text, parentId }: { text: string; parentId: string | null }) => {
      if (!user) throw new Error("Sign in first");
      const { error } = await supabase.from("comments").insert({
        entity_type: entityType,
        entity_id: entityId,
        body: text.trim(),
        user_id: user.id,
        page_id: identity.type === "page" ? identity.pageId : null,
        parent_comment_id: parentId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      if (vars.parentId) {
        setReplyBody("");
        setReplyTo(null);
      } else {
        setBody("");
      }
      toast.success("Comment posted");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error(e.message),
  });

  const report = useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: string; reason: string }) => {
      if (!user) throw new Error("Sign in first");
      const { error } = await supabase.from("content_requests").insert({
        user_id: user.id,
        entity_type: "comment",
        entity_id: commentId,
        request_type: "report",
        message: reason.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reported to our moderators");
      setReportTarget(null);
      setReportReason("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesOf = (parentId: string) => comments.filter((c) => c.parent_comment_id === parentId);

  function renderComment(c: CommentRow, depth: number) {
    const s = scores[c.id] ?? { net: 0, mine: 0 };
    return (
      <li key={c.id} className={depth > 0 ? "ml-6 mt-3 border-l border-border pl-4" : ""}>
        <div className="rounded border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">
              <UserLink
                userId={c.user_id}
                name={names[c.user_id]}
                username={usernames[c.user_id]}
                verified={c.page_id ? !!pages[c.page_id]?.verified : !!verified[c.user_id]}
                pageSlug={c.page_id ? pages[c.page_id]?.slug : undefined}
                pageName={c.page_id ? pages[c.page_id]?.name : undefined}
              />
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
              {user?.id === c.user_id ? (
                <button
                  aria-label="Delete comment"
                  onClick={() => remove.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{c.body}</p>
          <div className="mt-2 flex items-center gap-4">
            <VoteButtons net={s.net} mine={s.mine} onVote={(v) => vote(c.id, v)} />
            {user ? (
              <button
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
              >
                Reply
              </button>
            ) : null}
            {user && user.id !== c.user_id ? (
              <Dialog
                open={reportTarget === c.id}
                onOpenChange={(open) => setReportTarget(open ? c.id : null)}
              >
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive">
                    <Flag className="size-3" /> Report
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report this comment</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="What's wrong with this comment?"
                  />
                  <Button
                    variant="destructive"
                    disabled={reportReason.trim().length < 3 || report.isPending}
                    onClick={() => report.mutate({ commentId: c.id, reason: reportReason })}
                  >
                    {report.isPending ? "Sending…" : "Send report"}
                  </Button>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
          {replyTo === c.id ? (
            <div className="mt-3">
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                placeholder={`Reply to ${names[c.user_id] ?? "this comment"}`}
              />
              <Button
                size="sm"
                className="mt-2"
                disabled={replyBody.trim().length < 2 || post.isPending}
                onClick={() => post.mutate({ text: replyBody, parentId: c.id })}
              >
                {post.isPending ? "Posting…" : "Post reply"}
              </Button>
            </div>
          ) : null}
        </div>
        {repliesOf(c.id).length > 0 ? (
          <ul>{repliesOf(c.id).map((r) => renderComment(r, depth + 1))}</ul>
        ) : null}
      </li>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <MessageSquare className="size-5 text-accent" />
        Discussion
        <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
      </h2>

      {user ? (
        <div className="mt-4">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Share what you know: road conditions, what you witnessed, or advice for other road users."
          />
          <Button
            className="mt-2"
            disabled={body.trim().length < 3 || post.isPending}
            onClick={() => post.mutate({ text: body, parentId: null })}
          >
            {post.isPending ? "Posting…" : "Post comment"}
          </Button>
        </div>
      ) : (
        <p className="mt-4 rounded border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Link to="/auth" className="font-semibold text-foreground underline">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {isLoading ? <li className="text-sm text-muted-foreground">Loading comments…</li> : null}
        {topLevel.map((c) => renderComment(c, 0))}
        {!isLoading && comments.length === 0 ? (
          <li className="text-sm text-muted-foreground">No comments yet. Be the first.</li>
        ) : null}
      </ul>
    </section>
  );
}
