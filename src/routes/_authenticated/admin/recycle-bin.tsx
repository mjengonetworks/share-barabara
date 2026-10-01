import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, History, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, ROLE_RANK } from "@/hooks/useRoles";
import { RECYCLE_CONTENT_TYPES, recycleContentLabel, restoreRecycleBinItem, permanentlyDeleteRecycleBinItem } from "@/lib/recycle-bin.mjs";

export const Route = createFileRoute("/_authenticated/admin/recycle-bin")({
  head: () => ({ meta: [{ title: "Admin Recycle Bin: Share Barabara" }, { name: "robots", content: "noindex" }] }),
  component: AdminRecycleBinPage,
});

type Item = { id: string; content_type: string; title: string | null; owner_id: string | null; deleted_by: string | null; deletion_reason: string | null; deleted_at: string; status: string; deletion_origin: string };

function AdminRecycleBinPage() {
  const { rank, isAdmin, isLoading: roleLoading } = useRoles();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const query = useQuery({
    enabled: isAdmin,
    queryKey: ["admin-recycle-bin", type],
    queryFn: async () => {
      let request = (supabase.from("recycle_bin_items") as any).select("id,content_type,title,owner_id,deleted_by,deletion_reason,deleted_at,status,deletion_origin").eq("deletion_origin", "admin").eq("status", "deleted").order("deleted_at", { ascending: false }).limit(500);
      if (type !== "all") request = request.eq("content_type", type);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });
  const history = useQuery({ enabled: isAdmin, queryKey: ["admin-recycle-bin-history"], queryFn: async () => { const { data, error } = await (supabase.from("recycle_bin_history") as any).select("id,recycle_bin_item_id,actor_id,action,reason,created_at").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data ?? []; } });
  const action = useMutation({ mutationFn: async ({ id, permanent }: { id: string; permanent: boolean }) => permanent ? permanentlyDeleteRecycleBinItem(id) : restoreRecycleBinItem(id), onSuccess: (_, variables) => { toast.success(variables.permanent ? "Permanently deleted" : "Content restored"); queryClient.invalidateQueries({ queryKey: ["admin-recycle-bin"] }); queryClient.invalidateQueries({ queryKey: ["admin-recycle-bin-history"] }); }, onError: (error: Error) => toast.error(error.message || "Recycle-bin action failed") });
  if (roleLoading) return <div className="py-10 text-sm text-muted-foreground">Checking access…</div>;
  if (rank < ROLE_RANK.admin || !isAdmin) return <div className="py-16 text-center"><h1 className="text-2xl font-extrabold">Admin Recycle Bin</h1><p className="mt-2 text-muted-foreground">Only administrators can access administrative deletion records.</p></div>;
  const filtered = (query.data ?? []).filter((item) => !search.trim() || `${item.title ?? ""} ${item.owner_id ?? ""} ${item.deleted_by ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Administration</p><h1 className="mt-2 text-2xl font-extrabold">Admin Recycle Bin</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Administrative deletions only. Moderation removals remain in the moderation audit trail and are not restorable here.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input className="w-64 pl-9" placeholder="Search title or owner ID" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={type} onValueChange={setType}><SelectTrigger className="w-44" aria-label="Filter deleted type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem>{RECYCLE_CONTENT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div></div>{query.isLoading ? <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading deleted content…</div> : query.error ? <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm">Admin recycle-bin storage is not available. Apply the review migration before using this page.</div> : !filtered.length ? <div className="mt-8 rounded-lg border border-dashed border-border p-10 text-center"><ArchiveRestore className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-semibold">No administrative deletions found</p></div> : <div className="mt-8 space-y-3">{filtered.map((item) => <article key={item.id} className="rounded-lg border border-border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-accent">{recycleContentLabel(item.content_type)}</p><h2 className="mt-1 font-bold">{item.title || "Untitled content"}</h2><p className="mt-1 text-xs text-muted-foreground">Owner: {item.owner_id ?? "unknown"} · Deleted by: {item.deleted_by ?? "unknown"} · {new Date(item.deleted_at).toLocaleString()}</p>{item.deletion_reason ? <p className="mt-2 text-sm text-muted-foreground">Reason: {item.deletion_reason}</p> : null}</div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => action.mutate({ id: item.id, permanent: false })} disabled={action.isPending}><ArchiveRestore className="mr-2 size-4" />Restore</Button><Button size="sm" variant="destructive" onClick={() => { if (window.confirm("Permanently delete this content and preserve only its audit record?")) action.mutate({ id: item.id, permanent: true }); }} disabled={action.isPending}><Trash2 className="mr-2 size-4" />Delete permanently</Button></div></div></article>)}</div>}<section className="mt-10 rounded-lg border border-border bg-card p-4"><h2 className="flex items-center gap-2 font-bold"><History className="size-4 text-accent" /> Deletion history</h2><div className="mt-3 space-y-2 text-sm">{(history.data ?? []).slice(0, 20).map((event: any) => <div key={event.id} className="flex flex-wrap justify-between gap-2 border-t border-border pt-2"><span>{event.action} · {event.reason || "No reason recorded"}</span><span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span></div>)}{!history.data?.length ? <p className="text-muted-foreground">No recycle-bin actions recorded.</p> : null}</div></section></div>;
}
