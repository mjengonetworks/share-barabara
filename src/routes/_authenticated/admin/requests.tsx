import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { AttachmentGallery, type AttachmentRow } from "@/components/site/attachment-gallery";
import { PARTIES_INVOLVED } from "@/lib/constants";
import { timeAgo } from "@/lib/format";

// News is routed by slug, not id, and content_requests only stores the id —
// so only alert/report (routed by raw id) can link straight to the item.
const ENTITY_LINK: Partial<
  Record<string, (id: string) => { to: string; params: Record<string, string> }>
> = {
  alert: (id) => ({ to: "/alerts/$alertId", params: { alertId: id } }),
  report: (id) => ({ to: "/reports/$reportId", params: { reportId: id } }),
};

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({ meta: [{ title: "Requests: Share Barabara Admin" }] }),
  component: RequestsAdminPage,
});

function RequestsAdminPage() {
  const { user } = useAuth();
  const { canPublishArticles: canActOnSuspend } = useRoles();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames([
    ...requests.map((r) => r.user_id),
    ...requests.filter((r) => r.entity_type === "profile").map((r) => r.entity_id),
  ]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-requests"] });

  const resolve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "resolved" | "dismissed" }) => {
      const { error } = await supabase
        .from("content_requests")
        .update({ status, resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveSuspension = useMutation({
    mutationFn: async (request: { id: string; entity_id: string }) => {
      const { error: e1 } = await supabase
        .from("profiles")
        .update({ suspended: true })
        .eq("id", request.entity_id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("content_requests")
        .update({
          status: "resolved",
          resolved_by: user?.id ?? null,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("User suspended");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const liftSuspension = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ suspended: false })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Suspension lifted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Requests</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Edit and removal requests from contributors, plus suspension recommendations filed by
        moderators. Approving a suspension needs editor rank or above.
      </p>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && requests.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing in the queue.
        </p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {requests.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-4 card-elevated">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={r.status === "pending" ? "secondary" : "outline"}
                className="capitalize"
              >
                {r.status}
              </Badge>
              <span className="font-semibold capitalize">
                {r.request_type} · {r.entity_type}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Filed by <UserLink userId={r.user_id} name={names[r.user_id]} />
              {r.entity_type === "profile" ? (
                <>
                  {" "}
                  about <UserLink userId={r.entity_id} name={names[r.entity_id]} />
                </>
              ) : null}
              {ENTITY_LINK[r.entity_type] ? (
                <Link
                  {...ENTITY_LINK[r.entity_type]!(r.entity_id)}
                  target="_blank"
                  className="ml-1 inline-flex items-center gap-0.5 text-brand-blue underline"
                >
                  <ExternalLink className="size-3" /> View
                </Link>
              ) : null}
            </p>
            <p className="mt-2 text-sm text-foreground/90">{r.message}</p>

            {r.casualty_breakdown && Object.keys(r.casualty_breakdown).length > 0 ? (
              <div className="mt-2 rounded border border-dashed border-border bg-muted/30 p-2 text-xs">
                <p className="font-semibold text-muted-foreground">Suggested casualty counts</p>
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(
                    r.casualty_breakdown as Record<string, { dead?: number; injured?: number }>,
                  ).map(([party, counts]) => (
                    <li key={party}>
                      {PARTIES_INVOLVED.find((p) => p.value === party)?.label ?? party}:{" "}
                      {counts.dead ? `${counts.dead} dead` : ""}
                      {counts.dead && counts.injured ? ", " : ""}
                      {counts.injured ? `${counts.injured} injured` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <AttachmentGallery attachments={(r.attachments as AttachmentRow[] | null) ?? []} />

            {r.status === "pending" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.request_type === "suspend" && r.entity_type === "profile" ? (
                  canActOnSuspend ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={approveSuspension.isPending}
                      onClick={() => approveSuspension.mutate({ id: r.id, entity_id: r.entity_id })}
                    >
                      Approve suspension
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Only editors and admins can approve a suspension.
                    </p>
                  )
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: r.id, status: "resolved" })}
                >
                  Mark resolved
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={resolve.isPending}
                  onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}
                >
                  Dismiss
                </Button>
              </div>
            ) : r.request_type === "suspend" && r.entity_type === "profile" && canActOnSuspend ? (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={liftSuspension.isPending}
                  onClick={() => liftSuspension.mutate(r.entity_id)}
                >
                  Lift suspension
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
