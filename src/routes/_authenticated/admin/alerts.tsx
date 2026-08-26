import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { SeverityBadge } from "@/components/site/severity-badge";
import { timeAgo } from "@/lib/format";
import { KENYA_COUNTIES, SEVERITIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/alerts")({
  head: () => ({ meta: [{ title: "Hazard Alerts: Share Barabara Admin" }] }),
  component: AlertsAdminPage,
});

function AlertsAdminPage() {
  const queryClient = useQueryClient();
  const [county, setCounty] = useState("all");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["admin-alerts", county],
    queryFn: async () => {
      let query = supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (county !== "all") query = query.eq("county", county);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: names = {} } = useProfileNames(alerts.map((a) => a.user_id));

  const setSeverity = useMutation({
    mutationFn: async ({ id, severity }: { id: string; severity: string }) => {
      const { error } = await supabase.from("alerts").update({ severity }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-alerts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert removed");
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Hazard alerts</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Adjust severity or remove alerts that are spam, duplicate or resolved.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Select value={county} onValueChange={setCounty}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="all">All counties</SelectItem>
            {KENYA_COUNTIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead>County</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Reported by</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="max-w-xs">
                  <Link
                    to="/alerts/$alertId"
                    params={{ alertId: a.id }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{a.hazard_type.replace("_", " ")}</p>
                </TableCell>
                <TableCell>{a.county}</TableCell>
                <TableCell>
                  <Select
                    value={a.severity}
                    onValueChange={(v) => setSeverity.mutate({ id: a.id, severity: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SeverityBadge value={a.severity} />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <UserLink userId={a.user_id} name={names[a.user_id]} anonymous={a.is_anonymous} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {timeAgo(a.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(a.id)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No alerts found.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
