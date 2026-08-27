import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/merch-items")({
  head: () => ({ meta: [{ title: "Merch Items: Share Barabara Admin" }] }),
  component: MerchItemsPage,
});

const EMPTY = { name: "", description: "", price_kes: 0, image_url: "" };

function MerchItemsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-merch-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merch_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-merch-items"] });
    queryClient.invalidateQueries({ queryKey: ["merch-items"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("merch_items").insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_kes: form.price_kes,
        image_url: form.image_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item added");
      setForm(EMPTY);
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("merch_items").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, price_kes }: { id: string; price_kes: number }) => {
      const { error } = await supabase.from("merch_items").update({ price_kes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("merch_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Commerce
      </p>
      <h1 className="mt-1 text-[1.3125rem] font-extrabold">Merch items</h1>
      <p className="mt-2 text-muted-foreground">
        The catalogue shown on the public Merch page. Inactive items are hidden from shoppers.
      </p>

      <div className="mt-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 size-4" /> New item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New merch item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="mi-name">Name</Label>
                <Input
                  id="mi-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mi-desc">Description</Label>
                <Textarea
                  id="mi-desc"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="mi-price">Price (KES)</Label>
                <Input
                  id="mi-price"
                  type="number"
                  min={0}
                  value={form.price_kes}
                  onChange={(e) => setForm({ ...form, price_kes: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="mi-image">Image URL</Label>
                <Input
                  id="mi-image"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
              <Button
                disabled={form.name.trim().length < 2 || create.isPending}
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
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            {item.image_url ? (
              <img src={item.image_url} alt="" className="size-14 shrink-0 rounded object-cover" />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
                <ShoppingBag className="size-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{item.name}</p>
              {item.description ? (
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-sm">
              KES{" "}
              <Input
                type="number"
                min={0}
                defaultValue={item.price_kes}
                className="w-24"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== item.price_kes) updatePrice.mutate({ id: item.id, price_kes: v });
                }}
              />
            </div>
            <Switch
              checked={item.active}
              onCheckedChange={(v) => toggleActive.mutate({ id: item.id, active: v })}
            />
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(item.id)}
            >
              Delete
            </Button>
          </li>
        ))}
        {!isLoading && items.length === 0 ? (
          <p className="rounded border border-dashed border-border p-8 text-center text-muted-foreground">
            No merch items yet.
          </p>
        ) : null}
      </ul>
    </div>
  );
}
