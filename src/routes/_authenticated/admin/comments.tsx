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
import { moveToRecycleBin } from "@/lib/recycle-bin.mjs";
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
        .select("id,body,created_at,user_id,entity_type,entity_id,moderation_status,moderation_reason")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(comments.map((c) => c.user_id));

  const moderate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "published" | "removed" }) => {
      const { error } = await (supabase.from("comments") as any).update({ moderation_status: status, moderation_reason: status === "removed" ? "Removed during staff moderation review." : "Restored during staff moderation review." }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comment moderation status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const recycle = useMutation({
    mutationFn: async (id: string) => moveToRecycleBin("comment", id, "Moved to the Recycle Bin by an administrator"),
    onSuccess: () => { toast.success("Comment moved to the Recycle Bin"); queryClient.invalidateQueries({ queryKey: ["admin-comments"] }); queryClient.invalidateQueries({ queryKey: ["comments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Comments</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Review reported or problematic comments without erasing the discussion record. Moderation decisions are recorded in the protected audit history.
      </p>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comment</TableHead>
              <TableHead>By</TableHead>
              <TableHead>On</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell>
                  <div className="text-xs"><span className={c.moderation_status === "removed" ? "font-semibold text-destructive" : "font-semibold text-safe"}>{c.moderation_status ?? "published"}</span>{c.moderation_reason ? <p className="mt-1 max-w-xs text-muted-foreground">{c.moderation_reason}</p> : null}</div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {timeAgo(c.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={moderate.isPending || recycle.isPending}
                    onClick={() => moderate.mutate({ id: c.id, status: c.moderation_status === "removed" ? "published" : "removed" })}
                  >
                    {c.moderation_status === "removed" ? "Restore" : "Remove"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={moderate.isPending || recycle.isPending} onClick={() => recycle.mutate(c.id)}>Recycle</Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
