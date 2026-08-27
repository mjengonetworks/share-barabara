import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/partner-enquiries")({
  head: () => ({ meta: [{ title: "Partner Enquiries: Share Barabara Admin" }] }),
  component: PartnerEnquiriesPage,
});

const STATUSES = ["new", "contacted", "closed"] as const;
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  new: "default",
  contacted: "secondary",
  closed: "outline",
};

function PartnerEnquiriesPage() {
  const queryClient = useQueryClient();

  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["admin-partner-enquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_enquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("partner_enquiries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enquiry updated");
      queryClient.invalidateQueries({ queryKey: ["admin-partner-enquiries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_enquiries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enquiry removed");
      queryClient.invalidateQueries({ queryKey: ["admin-partner-enquiries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Directory &amp; partners
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Partner enquiries</h1>
      <p className="mt-2 text-muted-foreground">Submissions from the Partner With Us page.</p>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && enquiries.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          No enquiries yet.
        </p>
      ) : null}

      <ul className="mt-6 space-y-4">
        {enquiries.map((e) => (
          <li key={e.id} className="rounded-lg border border-border bg-card p-4 card-elevated">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[e.status] ?? "outline"} className="capitalize">
                {e.status}
              </Badge>
              <span className="font-semibold">{e.company}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {dateTime(e.created_at)}
              </span>
            </div>
            <p className="mt-1 text-sm">
              <a href={`mailto:${e.contact_email}`} className="text-brand-blue underline">
                {e.contact_email}
              </a>
              {e.budget ? (
                <span className="text-muted-foreground"> · Budget: {e.budget}</span>
              ) : null}
            </p>
            <p className="mt-2 text-sm text-foreground/90">{e.goals}</p>
            <div className="mt-3 flex items-center gap-2">
              <Select
                value={e.status}
                onValueChange={(v) => setStatus.mutate({ id: e.id, status: v })}
              >
                <SelectTrigger className="w-36 capitalize">
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
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(e.id)}
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
