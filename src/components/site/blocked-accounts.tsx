import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames, useProfileUsernames } from "@/lib/profiles";

type BlockRow = { blocked_id: string; created_at: string };

export function BlockedAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["blocked-accounts", user?.id];
  const { data: blocks = [], isLoading, error } = useQuery<BlockRow[]>({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error: queryError } = await (supabase.from("feed_blocks") as any)
        .select("blocked_id,created_at")
        .eq("blocker_id", user!.id)
        .order("created_at", { ascending: false });
      if (queryError) throw queryError;
      return (data ?? []) as BlockRow[];
    },
  });
  const ids = blocks.map((block) => block.blocked_id);
  const { data: names = {} } = useProfileNames(ids);
  const { data: usernames = {} } = useProfileUsernames(ids);
  const unblock = useMutation({
    mutationFn: async (blockedId: string) => {
      const { error: deleteError } = await (supabase.from("feed_blocks") as any)
        .delete()
        .eq("blocker_id", user!.id)
        .eq("blocked_id", blockedId);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast.success("Account unblocked");
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["feed-blocks", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
    onError: () => toast.error("We couldn't update your blocked accounts."),
  });

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-6 card-elevated">
      <h2 className="text-lg font-bold">Blocked accounts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Blocked members are hidden from your Feed. This does not hide their content from moderators.
      </p>
      {error ? (
        <p className="mt-4 rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Blocked accounts are unavailable until Feed storage is enabled.
        </p>
      ) : null}
      {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading blocked accounts…</p> : null}
      {!error && !isLoading && !blocks.length ? (
        <p className="mt-4 text-sm text-muted-foreground">You have not blocked any accounts.</p>
      ) : null}
      <ul className="mt-4 divide-y divide-border">
        {blocks.map((block) => (
          <li key={block.blocked_id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{names[block.blocked_id] ?? "Share Barabara member"}</p>
              {usernames[block.blocked_id] ? <p className="truncate text-xs text-muted-foreground">@{usernames[block.blocked_id]}</p> : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={unblock.isPending}
              onClick={() => unblock.mutate(block.blocked_id)}
            >
              Unblock
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
