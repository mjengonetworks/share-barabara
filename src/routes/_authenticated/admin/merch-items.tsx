import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/site/image-upload-field";
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

type VariantOptions = Record<string, string[]>;

/** Variant axes are free-form (Color, Size, Quality, ...) so the catalogue
 *  can grow beyond apparel without another schema change -- each axis is a
 *  name plus a comma-separated list of its options. */
function VariantOptionsEditor({
  value,
  onChange,
}: {
  value: VariantOptions;
  onChange: (next: VariantOptions) => void;
}) {
  const entries = Object.entries(value);
  const [newAxis, setNewAxis] = useState("");

  const addAxis = () => {
    const name = newAxis.trim();
    if (!name || value[name]) return;
    onChange({ ...value, [name]: [] });
    setNewAxis("");
  };

  return (
    <div className="space-y-2">
      {entries.map(([axis, options]) => (
        <div key={axis} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {axis}
          </span>
          <Input
            value={options.join(", ")}
            placeholder="e.g. Yellow, Navy Blue, Red"
            onChange={(e) => {
              const next = { ...value };
              next[axis] = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              onChange(next);
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            onClick={() => {
              const next = { ...value };
              delete next[axis];
              onChange(next);
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newAxis}
          onChange={(e) => setNewAxis(e.target.value)}
          placeholder="New variant type, e.g. Size"
          className="w-40"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addAxis();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addAxis}>
          Add variant type
        </Button>
      </div>
    </div>
  );
}

const EMPTY = {
  name: "",
  description: "",
  price_kes: 0,
  image_url: "",
  variant_options: {} as VariantOptions,
};

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
      return data as unknown as (typeof EMPTY & {
        id: string;
        active: boolean;
        in_stock: boolean;
      })[];
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
        variant_options: form.variant_options,
        in_stock: false,
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

  const toggleInStock = useMutation({
    mutationFn: async ({ id, in_stock }: { id: string; in_stock: boolean }) => {
      const { error } = await supabase.from("merch_items").update({ in_stock }).eq("id", id);
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

  const updateVariants = useMutation({
    mutationFn: async ({
      id,
      variant_options,
    }: {
      id: string;
      variant_options: VariantOptions;
    }) => {
      const { error } = await supabase.from("merch_items").update({ variant_options }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateImage = useMutation({
    mutationFn: async ({ id, image_url }: { id: string; image_url: string }) => {
      const { error } = await supabase
        .from("merch_items")
        .update({ image_url: image_url || null })
        .eq("id", id);
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
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Merch items</h1>
      <p className="mt-2 text-muted-foreground">
        The catalogue shown on the public Merch page. Inactive items are hidden entirely; an item
        that's active but out of stock is shown but can't be added to a cart.
      </p>

      <div className="mt-6">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 size-4" /> New item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
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
                <Label>Image</Label>
                <div className="mt-2">
                  <ImageUploadField
                    value={form.image_url}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                  />
                </div>
              </div>
              <div>
                <Label>Variants (optional)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  E.g. a "Color" axis with Yellow, Navy Blue, Red. Leave empty for a single-SKU
                  item.
                </p>
                <div className="mt-2">
                  <VariantOptionsEditor
                    value={form.variant_options}
                    onChange={(v) => setForm({ ...form, variant_options: v })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                New items start out of stock; flip the switch once ready to sell.
              </p>
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
          <li key={item.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  className="size-14 shrink-0 rounded object-cover"
                />
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
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(item.id)}
              >
                Delete
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={item.active}
                  onCheckedChange={(v) => toggleActive.mutate({ id: item.id, active: v })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={item.in_stock}
                  onCheckedChange={(v) => toggleInStock.mutate({ id: item.id, in_stock: v })}
                />
                In stock
              </label>
            </div>
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Variants
              </p>
              <div className="mt-2">
                <VariantOptionsEditor
                  value={(item.variant_options as VariantOptions) ?? {}}
                  onChange={(v) => updateVariants.mutate({ id: item.id, variant_options: v })}
                />
              </div>
            </div>
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Replace image
              </p>
              <div className="mt-2">
                <ImageUploadField
                  value={item.image_url ?? ""}
                  onChange={(url) => updateImage.mutate({ id: item.id, image_url: url })}
                />
              </div>
            </div>
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
