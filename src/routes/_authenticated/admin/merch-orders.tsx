import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/merch-orders")({
  head: () => ({ meta: [{ title: "Merch Orders: Share Barabara Admin" }] }),
  component: MerchOrdersPage,
});

const STATUSES = ["new", "processing", "shipped", "cancelled"] as const;

function MerchOrdersPage() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-merch-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merch_orders")
        .select("*, merch_order_items(*)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("merch_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["admin-merch-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("merch_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order removed");
      queryClient.invalidateQueries({ queryKey: ["admin-merch-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Commerce
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Merch orders</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Orders placed from the Merch page cart, with delivery details. Delivery cost isn't included
        in the total, it's arranged separately once the customer is contacted.
      </p>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Items</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="max-w-xs text-sm">
                  {(o.merch_order_items ?? []).map((li) => (
                    <p key={li.id}>
                      {li.item_name} × {li.quantity}
                      {Object.keys((li.variant_selections as Record<string, string>) ?? {}).length >
                      0 ? (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          (
                          {Object.entries((li.variant_selections as Record<string, string>) ?? {})
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")}
                          )
                        </span>
                      ) : null}
                    </p>
                  ))}
                </TableCell>
                <TableCell className="text-sm">
                  <p>{o.contact_name}</p>
                  <p className="text-xs text-muted-foreground">{o.contact_phone}</p>
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {o.delivery_county ? <p>{o.delivery_county}</p> : null}
                  {o.delivery_address ? <p>{o.delivery_address}</p> : null}
                  {o.delivery_notes ? <p className="italic">{o.delivery_notes}</p> : null}
                  {!o.delivery_county && !o.delivery_address && !o.delivery_notes ? "—" : null}
                </TableCell>
                <TableCell className="text-sm font-semibold">KES {num(o.total_kes)}</TableCell>
                <TableCell>
                  <Select
                    value={o.status}
                    onValueChange={(v) => setStatus.mutate({ id: o.id, status: v })}
                  >
                    <SelectTrigger className="w-32 capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {dateTime(o.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(o.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
