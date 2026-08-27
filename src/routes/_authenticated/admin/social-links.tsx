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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { SocialIcon, SOCIAL_ICON_OPTIONS } from "@/components/site/social-icon";

export const Route = createFileRoute("/_authenticated/admin/social-links")({
  head: () => ({ meta: [{ title: "Social Links: Share Barabara Admin" }] }),
  component: SocialLinksPage,
});

const EMPTY: { label: string; icon_key: string; href: string } = {
  label: "",
  icon_key: SOCIAL_ICON_OPTIONS[0] ?? "facebook",
  href: "",
};

function SocialLinksPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin-social-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_links")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-social-links"] });
    queryClient.invalidateQueries({ queryKey: ["social-links"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const nextOrder = links.reduce((m, l) => Math.max(m, l.sort_order), 0) + 1;
      const { error } = await supabase.from("social_links").insert({
        label: form.label.trim(),
        icon_key: form.icon_key,
        href: form.href.trim(),
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Social link added");
      setForm(EMPTY);
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("social_links").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateHref = useMutation({
    mutationFn: async ({ id, href }: { id: string; href: string }) => {
      const { error } = await supabase.from("social_links").update({ href }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Social link removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Site content
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Social links</h1>
      <p className="mt-2 text-muted-foreground">
        Shown as icons in the site footer. Add, remove or swap the icon and destination for each.
      </p>

      <div className="mt-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 size-4" /> New social link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New social link</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="s-label">Label</Label>
                <Input
                  id="s-label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Icon</Label>
                <Select
                  value={form.icon_key}
                  onValueChange={(v) => setForm({ ...form, icon_key: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOCIAL_ICON_OPTIONS.map((k) => (
                      <SelectItem key={k} value={k} className="capitalize">
                        <span className="flex items-center gap-2">
                          <SocialIcon iconKey={k} className="size-4" /> {k}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="s-href">Link</Label>
                <Input
                  id="s-href"
                  value={form.href}
                  onChange={(e) => setForm({ ...form, href: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <Button
                disabled={form.label.trim().length < 2 || !form.href.trim() || create.isPending}
                onClick={() => create.mutate()}
              >
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {links.map((l) => (
          <li key={l.id} className="flex items-center gap-3 p-3">
            <SocialIcon iconKey={l.icon_key} className="size-5 shrink-0 text-muted-foreground" />
            <span className="w-24 shrink-0 text-sm font-medium">{l.label}</span>
            <Input
              defaultValue={l.href}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== l.href) updateHref.mutate({ id: l.id, href: v });
              }}
              className="flex-1"
            />
            <Switch
              checked={l.active}
              onCheckedChange={(v) => toggleActive.mutate({ id: l.id, active: v })}
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(l.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
