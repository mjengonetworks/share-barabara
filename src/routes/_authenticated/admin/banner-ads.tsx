import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/banner-ads")({
  head: () => ({ meta: [{ title: "Banner Ads: Share Barabara Admin" }] }),
  component: BannerAdsPage,
});

const EMPTY = {
  title: "",
  advertiser: "",
  image_url: "",
  link_url: "",
  placement: "site-default",
  starts_at: "",
  ends_at: "",
  priority: "0",
};

function toTimestamp(value: string) {
  return value.trim() ? new Date(value).toISOString() : null;
}

function isPlacementSchemaMissing(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .*placement|column .*starts_at|column .*ends_at|column .*priority/i.test(
      error.message ?? "",
    )
  );
}

function BannerAdsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin-banner-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banner_ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-banner-ads"] });
    queryClient.invalidateQueries({ queryKey: ["banner-ads"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const draft = {
        title: form.title.trim(),
        advertiser: form.advertiser.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim(),
        placement: form.placement.trim() || "site-default",
        starts_at: toTimestamp(form.starts_at),
        ends_at: toTimestamp(form.ends_at),
        priority: Number.parseInt(form.priority, 10) || 0,
      };
      const { error } = await supabase.from("banner_ads").insert(draft);
      if (!error) return;
      if (!isPlacementSchemaMissing(error)) throw error;
      // Keep existing admin creation usable until the additive migration is approved/applied.
      const legacy = await supabase.from("banner_ads").insert({
        title: draft.title,
        advertiser: draft.advertiser,
        image_url: draft.image_url,
        link_url: draft.link_url,
      });
      if (legacy.error) throw legacy.error;
    },
    onSuccess: () => {
      toast.success("Banner ad created");
      setForm(EMPTY);
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("Select an advertisement to edit");
      const draft = {
        title: form.title.trim(),
        advertiser: form.advertiser.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim(),
        placement: form.placement.trim() || "site-default",
        starts_at: toTimestamp(form.starts_at),
        ends_at: toTimestamp(form.ends_at),
        priority: Number.parseInt(form.priority, 10) || 0,
      };
      const { error } = await supabase
        .from("banner_ads")
        .update(draft)
        .eq("id", editingId);
      if (!error) return;
      if (!isPlacementSchemaMissing(error)) throw error;
      const legacy = await supabase
        .from("banner_ads")
        .update({
          title: draft.title,
          advertiser: draft.advertiser,
          image_url: draft.image_url,
          link_url: draft.link_url,
        })
        .eq("id", editingId);
      if (legacy.error) throw legacy.error;
    },
    onSuccess: () => {
      toast.success("Banner ad updated");
      setForm(EMPTY);
      setEditingId(null);
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("banner_ads").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banner_ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Banner ad removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Site content
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Banner ads</h1>
      <p className="mt-2 text-muted-foreground">
        Shown across article, alert and report pages. Inactive ads never rotate in.
      </p>

      <div className="mt-6">
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (!nextOpen) {
              setForm(EMPTY);
              setEditingId(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 size-4" /> New banner ad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit banner ad" : "New banner ad"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="b-title">Title</Label>
                <Input
                  id="b-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="b-advertiser">Advertiser</Label>
                <Input
                  id="b-advertiser"
                  value={form.advertiser}
                  onChange={(e) => setForm({ ...form, advertiser: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="b-image">Image URL</Label>
                <Input
                  id="b-image"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="b-link">Link URL</Label>
                <Input
                  id="b-link"
                  required
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label htmlFor="b-placement">Placement</Label>
                <Input
                  id="b-placement"
                  value={form.placement}
                  onChange={(e) => setForm({ ...form, placement: e.target.value })}
                  placeholder="e.g. homepage-between-news-reports"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="b-starts">Starts at (optional)</Label>
                  <Input
                    id="b-starts"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="b-ends">Ends at (optional)</Label>
                  <Input
                    id="b-ends"
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="b-priority">Display priority</Label>
                <Input
                  id="b-priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                />
              </div>
              <Button
                disabled={
                  form.title.trim().length < 2 ||
                  !form.link_url.trim() ||
                  create.isPending ||
                  update.isPending
                }
                onClick={() => (editingId ? update.mutate() : create.mutate())}
              >
                {editingId ? "Save changes" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <ul className="mt-6 space-y-3">
        {ads.map((ad) => (
          <li
            key={ad.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            {ad.image_url ? (
              <img src={ad.image_url} alt={ad.title} className="h-10 w-auto rounded" />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{ad.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ad.advertiser ? `${ad.advertiser} · ` : ""}
                {ad.link_url} · Placement: {ad.placement ?? "site-default"} · Priority: {ad.priority ?? 0}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={ad.active}
                onCheckedChange={(v) => toggleActive.mutate({ id: ad.id, active: v })}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingId(ad.id);
                  setForm({
                    title: ad.title,
                    advertiser: ad.advertiser ?? "",
                    image_url: ad.image_url ?? "",
                    link_url: ad.link_url,
                    placement: ad.placement ?? "site-default",
                    starts_at: ad.starts_at ? ad.starts_at.slice(0, 16) : "",
                    ends_at: ad.ends_at ? ad.ends_at.slice(0, 16) : "",
                    priority: String(ad.priority ?? 0),
                  });
                  setOpen(true);
                }}
              >
                <Pencil className="mr-1 size-4" /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(ad.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
