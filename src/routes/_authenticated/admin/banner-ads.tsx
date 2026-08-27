import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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

const EMPTY = { title: "", advertiser: "", image_url: "", link_url: "" };

function BannerAdsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

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
      const { error } = await supabase.from("banner_ads").insert({
        title: form.title.trim(),
        advertiser: form.advertiser.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Banner ad created");
      setForm(EMPTY);
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 size-4" /> New banner ad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New banner ad</DialogTitle>
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
              <Button
                disabled={form.title.trim().length < 2 || !form.link_url.trim() || create.isPending}
                onClick={() => create.mutate()}
              >
                Create
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
                {ad.link_url}
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
