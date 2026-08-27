import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart, type CartLine } from "@/hooks/useCart";
import { num } from "@/lib/format";
import { KENYA_COUNTIES } from "@/lib/constants";
import { BannerAd } from "@/components/site/banner-ad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/merch")({
  head: () => ({
    meta: [
      { title: "Merch: Share Barabara" },
      {
        name: "description",
        content:
          "Share Barabara merchandise: pens, reflector jackets, t-shirts and hoodies. Every journey home should end at home.",
      },
    ],
  }),
  component: MerchPage,
});

type MerchItem = {
  id: string;
  name: string;
  description: string | null;
  price_kes: number;
  image_url: string | null;
  in_stock: boolean;
  variant_options: Record<string, string[]>;
};

function MerchPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["merch-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merch_items")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as MerchItem[];
    },
  });
  const cart = useCart();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
            Shop
          </p>
          <h1 className="mt-2 text-[1.7325rem] font-extrabold">Share Barabara merch</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Pens, reflector jackets, t-shirts and hoodies carrying the message: every journey home
            should end at home. Proceeds support Share Barabara campaigns.
          </p>
        </div>
        <CartSheet cart={cart} />
      </div>

      {isLoading ? <p className="mt-10 text-muted-foreground">Loading merch…</p> : null}
      {!isLoading && items.length === 0 ? (
        <p className="mt-10 rounded border border-dashed border-border p-10 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-2 size-8" />
          The storefront is being stocked. Check back soon, or contact us directly to place an order
          at{" "}
          <a href="mailto:sharebarabara@gmail.com" className="underline">
            sharebarabara@gmail.com
          </a>
          .
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} onAddToCart={cart.addItem} />
        ))}
      </div>

      {items.length > 0 ? (
        <div className="mt-10">
          <BannerAd />
        </div>
      ) : null}

      <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 p-6">
        <h2 className="font-bold">How to order</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add items to your cart, then check out with your delivery details. Delivery is charged
          separately after checkout, once we confirm your location. We'll be in touch to arrange
          payment while our online checkout is still being finished, or you can pay directly via
          M-Pesa (0701 951 682) or PayPal (phmuok@gmail.com).
        </p>
      </div>
    </div>
  );
}

function ProductCard({
  item,
  onAddToCart,
}: {
  item: MerchItem;
  onAddToCart: (line: Omit<CartLine, "quantity">) => void;
}) {
  const axes = Object.entries(item.variant_options ?? {}).filter(([, opts]) => opts.length > 0);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const missingAxis = axes.find(([axis]) => !selected[axis]);

  const addToCart = () => {
    onAddToCart({
      itemId: item.id,
      name: item.name,
      price_kes: item.price_kes,
      image_url: item.image_url,
      variantSelections: selected,
    });
    toast.success(`Added ${item.name} to cart`);
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-5 card-elevated">
      <div className="relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="aspect-square w-full rounded object-cover"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded bg-muted">
            <ShoppingBag className="size-10 text-muted-foreground" />
          </div>
        )}
        {!item.in_stock ? (
          <Badge variant="secondary" className="absolute right-2 top-2">
            Out of stock
          </Badge>
        ) : null}
      </div>
      <h2 className="mt-3 font-bold">{item.name}</h2>
      {item.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
      ) : null}
      <p className="mt-2 font-display text-lg font-extrabold">KES {num(item.price_kes)}</p>

      {axes.length > 0 ? (
        <div className="mt-3 space-y-2">
          {axes.map(([axis, options]) => (
            <div key={axis}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {axis}
              </p>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={selected[axis] ?? ""}
                onValueChange={(v) => v && setSelected((prev) => ({ ...prev, [axis]: v }))}
                className="mt-1 flex-wrap justify-start"
              >
                {options.map((opt) => (
                  <ToggleGroupItem key={opt} value={opt} className="h-8 px-3 text-xs">
                    {opt}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ))}
        </div>
      ) : null}

      <Button
        className="mt-4 w-full"
        disabled={!item.in_stock || !!missingAxis}
        onClick={addToCart}
      >
        {!item.in_stock ? "Out of stock" : missingAxis ? `Select ${missingAxis[0]}` : "Add to cart"}
      </Button>
    </div>
  );
}

function CartSheet({ cart }: { cart: ReturnType<typeof useCart> }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    contact_name: "",
    contact_phone: "",
    delivery_county: "",
    delivery_address: "",
    delivery_notes: "",
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { data: order, error } = await supabase
        .from("merch_orders")
        .insert({
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          delivery_county: form.delivery_county || null,
          delivery_address: form.delivery_address.trim() || null,
          delivery_notes: form.delivery_notes.trim() || null,
          user_id: user?.id ?? null,
          total_kes: cart.totalKes,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: itemsError } = await supabase.from("merch_order_items").insert(
        cart.lines.map((l) => ({
          order_id: order.id,
          item_id: l.itemId,
          item_name: l.name,
          unit_price_kes: l.price_kes,
          quantity: l.quantity,
          variant_selections: l.variantSelections,
        })),
      );
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      toast.success("Order placed");
      setSent(true);
      cart.clear();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => {
    setOpen(false);
    setCheckingOut(false);
    setSent(false);
    setForm({
      contact_name: "",
      contact_phone: "",
      delivery_county: "",
      delivery_address: "",
      delivery_notes: "",
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="mr-1.5 size-4" /> Cart
          {cart.totalItems > 0 ? (
            <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {cart.totalItems}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{checkingOut ? "Checkout" : "Your cart"}</SheetTitle>
        </SheetHeader>

        {sent ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-safe">
            <CheckCircle2 className="size-5 shrink-0" /> Order placed. We'll contact you to confirm
            payment and delivery, which is charged separately.
          </p>
        ) : checkingOut ? (
          <form
            className="mt-4 flex-1 space-y-4 overflow-y-auto"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div>
              <Label htmlFor="co-name">Your name</Label>
              <Input
                id="co-name"
                required
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="co-phone">Phone number</Label>
              <Input
                id="co-phone"
                required
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Delivery county</Label>
              <Select
                value={form.delivery_county}
                onValueChange={(v) => setForm({ ...form, delivery_county: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {KENYA_COUNTIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="co-address">Delivery address</Label>
              <Input
                id="co-address"
                required
                placeholder="Estate, street, building, or a nearby landmark"
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="co-notes">Delivery notes (optional)</Label>
              <Textarea
                id="co-notes"
                rows={2}
                value={form.delivery_notes}
                onChange={(e) => setForm({ ...form, delivery_notes: e.target.value })}
                placeholder="Preferred delivery time, alternate contact, etc."
              />
            </div>
            <p className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Delivery is charged separately after checkout, once we confirm your location. Total
              below is for goods only: KES {num(cart.totalKes)}.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setCheckingOut(false)}>
                Back to cart
              </Button>
              <Button type="submit" className="flex-1" disabled={submit.isPending}>
                {submit.isPending ? "Placing order…" : "Place order"}
              </Button>
            </div>
          </form>
        ) : cart.lines.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Your cart is empty.</p>
        ) : (
          <div className="mt-4 flex flex-1 flex-col overflow-y-auto">
            <ul className="flex-1 space-y-4">
              {cart.lines.map((l) => {
                const key = `${l.itemId}-${JSON.stringify(l.variantSelections)}`;
                return (
                  <li key={key} className="flex gap-3">
                    {l.image_url ? (
                      <img
                        src={l.image_url}
                        alt=""
                        className="size-16 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
                        <ShoppingBag className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{l.name}</p>
                      {Object.keys(l.variantSelections).length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {Object.entries(l.variantSelections)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                        </p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">KES {num(l.price_kes)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-6"
                          onClick={() =>
                            cart.updateQuantity(l.itemId, l.variantSelections, l.quantity - 1)
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{l.quantity}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-6"
                          onClick={() =>
                            cart.updateQuantity(l.itemId, l.variantSelections, l.quantity + 1)
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="ml-auto size-6 text-destructive"
                          onClick={() => cart.removeItem(l.itemId, l.variantSelections)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between font-semibold">
                <span>Subtotal</span>
                <span>KES {num(cart.totalKes)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivery is charged separately after checkout.
              </p>
              <Button className="mt-3 w-full" onClick={() => setCheckingOut(true)}>
                Checkout
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
