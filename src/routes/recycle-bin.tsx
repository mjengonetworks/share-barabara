import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RECYCLE_CONTENT_TYPES, recycleContentLabel, restoreRecycleBinItem, permanentlyDeleteRecycleBinItem } from "@/lib/recycle-bin.mjs";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/recycle-bin")({
  head: () => ({ meta: [{ title: "My Recycle Bin: Share Barabara" }, { name: "robots", content: "noindex" }] }),
  component: UserRecycleBinPage,
});

type Item = { id: string; content_type: string; title: string | null; deletion_reason: string | null; deleted_at: string; purge_after: string | null; deletion_origin: string; status: string };

function UserRecycleBinPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = useState("all");
  const items = useQuery({
    enabled: !!user,
    queryKey: ["my-recycle-bin", user?.id, type],
    queryFn: async () => {
      let query = (supabase.from("recycle_bin_items") as any).select("id,content_type,title,deletion_reason,deleted_at,purge_after,deletion_origin,status").eq("deletion_origin", "user").eq("status", "deleted").order("deleted_at", { ascending: false }).limit(100);
      if (type !== "all") query = query.eq("content_type", type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });
  const action = useMutation({
    mutationFn: async ({ id, permanent }: { id: string; permanent: boolean }) => permanent ? permanentlyDeleteRecycleBinItem(id) : restoreRecycleBinItem(id),
    onSuccess: (_, variables) => { toast.success(variables.permanent ? "Permanently deleted" : "Content restored"); queryClient.invalidateQueries({ queryKey: ["my-recycle-bin"] }); },
    onError: (error: Error) => toast.error(error.message || "Recycle-bin action failed"),
  });

  if (!user) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-2xl font-extrabold">My Recycle Bin</h1><p className="mt-3 text-muted-foreground">Sign in to view content you deleted.</p></main>;
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Profile / Settings</p><h1 className="mt-2 text-3xl font-extrabold">My Recycle Bin</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Only content you deleted appears here. Staff removals stay in moderation records and cannot be restored from this page.</p></div><Select value={type} onValueChange={setType}><SelectTrigger className="w-48" aria-label="Filter deleted content"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All content</SelectItem>{RECYCLE_CONTENT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
    {items.isLoading ? <div className="mt-8 flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading your deleted content…</div> : items.error ? <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm"><p className="font-semibold">Recycle Bin is not available right now.</p><p className="mt-1 text-muted-foreground">Please try again later. Your content has not been changed.</p></div> : !items.data?.length ? <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center"><ArchiveRestore className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">Your recycle bin is empty</p><p className="mt-1 text-sm text-muted-foreground">Deleted content will remain recoverable here for the configured retention period.</p></div> : <div className="mt-8 space-y-3">{items.data.map((item) => <article key={item.id} className="rounded-lg border border-border bg-card p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-accent">{recycleContentLabel(item.content_type)}</p><h2 className="mt-1 break-words font-bold">{item.title || "Untitled content"}</h2><p className="mt-1 text-sm text-muted-foreground">Deleted {dateTime(item.deleted_at)}{item.purge_after ? ` · retained until ${dateTime(item.purge_after)}` : ""}</p>{item.deletion_reason ? <p className="mt-2 text-sm text-muted-foreground">Reason: {item.deletion_reason}</p> : null}</div><div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" onClick={() => action.mutate({ id: item.id, permanent: false })} disabled={action.isPending}><ArchiveRestore className="mr-2 size-4" />Restore</Button><Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Permanently delete this content? This cannot be undone.")) action.mutate({ id: item.id, permanent: true }); }} disabled={action.isPending}><Trash2 className="mr-2 size-4" />Delete permanently</Button></div></div></article>)}</div>}
  </main>;
}
