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
import { dateTime } from "@/lib/format";

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
        .select("*, merch_items(name)")
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
      <h1 className="mt-1 text-[1.3125rem] font-extrabold">Merch orders</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Order requests submitted from the Merch page, with delivery details.
      </p>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  {o.merch_items?.name ?? "—"} × {o.quantity}
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
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
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
