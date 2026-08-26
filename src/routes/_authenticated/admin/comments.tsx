import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/comments")({
  head: () => ({ meta: [{ title: "Comments: Share Barabara Admin" }] }),
  component: CommentsAdminPage,
});

function CommentsAdminPage() {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(comments.map((c) => c.user_id));

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Comments</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Remove spam, abuse or off-topic comments across articles, alerts and reports.
      </p>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comment</TableHead>
              <TableHead>By</TableHead>
              <TableHead>On</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="max-w-md">
                  <p className="line-clamp-2 text-sm">{c.body}</p>
                </TableCell>
                <TableCell>
                  <UserLink userId={c.user_id} name={names[c.user_id]} />
                </TableCell>
                <TableCell>
                  {c.entity_type === "alert" ? (
                    <Link
                      to="/alerts/$alertId"
                      params={{ alertId: c.entity_id }}
                      className="text-xs capitalize text-brand-blue hover:underline"
                    >
                      alert
                    </Link>
                  ) : c.entity_type === "report" ? (
                    <Link
                      to="/reports/$reportId"
                      params={{ reportId: c.entity_id }}
                      className="text-xs capitalize text-brand-blue hover:underline"
                    >
                      report
                    </Link>
                  ) : (
                    <span className="text-xs capitalize text-muted-foreground">
                      {c.entity_type}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {timeAgo(c.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(c.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No comments found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
