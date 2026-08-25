import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { num } from "@/lib/format";
import { BannerAd } from "@/components/site/banner-ad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/merch")({
  head: () => ({
    meta: [
      { title: "Merch: Share Barabara" },
      {
        name: "description",
        content: "Share Barabara merchandise: reflective jackets, t-shirts, caps and stickers. Every journey home should end at home.",
      },
    ],
  }),
  component: MerchPage,
});

function MerchPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["merch-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merch_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Shop</p>
      <h1 className="mt-2 text-4xl font-extrabold">Share Barabara merch</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Reflective jackets, t-shirts, caps and stickers carrying the message: every journey home
        should end at home. Proceeds support Share Barabara campaigns.
      </p>

      <div className="mt-6">
        <BannerAd />
      </div>

      {isLoading ? <p className="mt-10 text-muted-foreground">Loading merch…</p> : null}
      {!isLoading && items.length === 0 ? (
        <p className="mt-10 rounded border border-dashed border-border p-10 text-center text-muted-foreground">
          <ShoppingBag className="mx-auto mb-2 size-8" />
          The storefront is being stocked. Check back soon, or contact us directly to place an
          order at <a href="mailto:sharebarabara@gmail.com" className="underline">sharebarabara@gmail.com</a>.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-card p-5 card-elevated">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="aspect-square w-full rounded object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded bg-muted">
                <ShoppingBag className="size-10 text-muted-foreground" />
              </div>
            )}
            <h2 className="mt-3 font-bold">{item.name}</h2>
            {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
            <p className="mt-2 font-display text-lg font-extrabold">KES {num(item.price_kes)}</p>
            <OrderDialog itemId={item.id} itemName={item.name} />
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-border bg-muted/40 p-6">
        <h2 className="font-bold">How to order</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose an item and submit an order request with your contact details. We will confirm
          availability and arrange payment via M-Pesa (0701 951 682) or PayPal (phmuok@gmail.com).
          An online checkout is coming soon.
        </p>
      </div>
    </div>
  );
}

function OrderDialog({ itemId, itemName }: { itemId: string; itemName: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ contact_name: "", contact_phone: "", quantity: 1, delivery_notes: "" });

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("merch_orders").insert({
        ...form,
        item_id: itemId,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order request sent");
      setSent(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mt-4 w-full">Order</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order: {itemName}</DialogTitle>
        </DialogHeader>
        {sent ? (
          <p className="flex items-center gap-2 text-sm text-safe">
            <CheckCircle2 className="size-5" /> Request received. We will contact you to confirm
            payment and delivery.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div>
              <Label htmlFor="m-name">Your name</Label>
              <Input
                id="m-name"
                required
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="m-phone">Phone number</Label>
              <Input
                id="m-phone"
                required
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="m-qty">Quantity</Label>
              <Input
                id="m-qty"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="m-notes">Delivery notes (optional)</Label>
              <Textarea
                id="m-notes"
                rows={2}
                value={form.delivery_notes}
                onChange={(e) => setForm({ ...form, delivery_notes: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submit.isPending}>
              {submit.isPending ? "Sending…" : "Send order request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
