import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { PageForm } from "@/components/site/page-form";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  head: () => ({ meta: [{ title: "Pages: Share Barabara Admin" }] }),
  component: PagesAdminPage,
});

function PagesAdminPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["admin-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(pages.map((p) => p.owner_id));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-pages"] });
    queryClient.invalidateQueries({ queryKey: ["pages"] });
  };

  const toggleVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("pages").update({ verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Page removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = pages.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.county ?? "").toLowerCase().includes(q)
    );
  });

  const editingPage = pages.find((p) => p.id === editingId) ?? null;

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Directory &amp; partners
      </p>
      <h1 className="mt-1 text-[1.3125rem] font-extrabold">Pages</h1>
      <p className="mt-2 text-muted-foreground">
        Organisation pages in the directory. Verifying a page grants it a blue checkmark, normally a
        paid perk you can also activate manually here.
      </p>

      <div className="mt-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, category or county"
          className="max-w-sm"
        />
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && filtered.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          No pages match.
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            {p.logo_url ? (
              <img src={p.logo_url} alt="" className="size-12 shrink-0 rounded object-cover" />
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                <Building2 className="size-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.category}
                {p.county ? ` · ${p.county}` : ""} · owned by{" "}
                <UserLink userId={p.owner_id} name={names[p.owner_id]} />
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-muted-foreground">Verified</span>
              <Switch
                checked={p.verified}
                onCheckedChange={(v) => toggleVerified.mutate({ id: p.id, verified: v })}
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditingId(p.id)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(p.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit page</DialogTitle>
          </DialogHeader>
          {editingPage ? (
            <PageForm
              existing={editingPage}
              onDone={() => {
                setEditingId(null);
                refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
