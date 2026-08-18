import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { timeAgo } from "@/lib/format";

type Props = { entityType: "news" | "alert" | "report"; entityId: string };

export function CommentSection({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const key = ["comments", entityType, entityId];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, body, created_at, user_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(comments.map((c) => c.user_id));

  const post = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      const { error } = await supabase.from("comments").insert({
        entity_type: entityType,
        entity_id: entityId,
        body: body.trim(),
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
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
            placeholder="Share what you know — road conditions, what you witnessed, or advice for other road users."
          />
          <Button
            className="mt-2"
            disabled={body.trim().length < 3 || post.isPending}
            onClick={() => post.mutate()}
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
        {comments.map((c) => (
          <li key={c.id} className="rounded border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{names[c.user_id] ?? "Road user"}</p>
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
          </li>
        ))}
        {!isLoading && comments.length === 0 ? (
          <li className="text-sm text-muted-foreground">No comments yet. Be the first.</li>
        ) : null}
      </ul>
    </section>
  );
}