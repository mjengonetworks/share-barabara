import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Eye, MoreVertical, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { moveToRecycleBin } from "@/lib/recycle-bin.mjs";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { SeverityBadge } from "@/components/site/severity-badge";
import { dateTime } from "@/lib/format";
import { KENYA_COUNTIES, PARTIES_INVOLVED } from "@/lib/constants";
import { useHazardTypes, useAlertSeverities } from "@/hooks/useTaxonomy";
import { useViewCounts } from "@/hooks/useViewCounts";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListingSurface } from "@/components/admin/admin-listing-surface";

export const Route = createFileRoute("/_authenticated/admin/alerts")({
  head: () => ({ meta: [{ title: "Hazard Alerts: Share Barabara Admin" }] }),
  component: AlertsAdminPage,
});

function AlertsAdminPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (/^\/admin\/alerts\/(?:new|[^/]+\/edit)\/?$/.test(pathname)) return <Outlet />;
  const queryClient = useQueryClient();
  const { data: hazardTypes = [] } = useHazardTypes();
  const { data: severities = [] } = useAlertSeverities();
  const [county, setCounty] = useState("all");
  const [hazard, setHazard] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: allAlerts = [], isLoading } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const alerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAlerts.filter((a) => {
      if (county !== "all" && a.county !== county) return false;
      if (hazard !== "all" && a.hazard_type !== hazard) return false;
      if (severity !== "all" && a.severity !== severity) return false;
      if (status !== "all" && a.status !== status) return false;
      if (q && !a.title.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [allAlerts, county, hazard, severity, status, search]);

  const { data: names = {} } = useProfileNames(alerts.map((a) => a.user_id));
  const { data: viewCounts = {}, isError: viewCountsError } = useViewCounts(
    "alert_views",
    "alert_id",
    alerts.map((a) => a.id),
  );

  const setSeverityMutation = useMutation({
    mutationFn: async ({ id, severity: s }: { id: string; severity: string }) => {
      const { error } = await supabase.from("alerts").update({ severity: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-alerts"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setFeaturedMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("alerts").update({ featured } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Featured selection updated");
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await moveToRecycleBin("alert", id, "Removed by an administrator");
    },
    onSuccess: () => {
      toast.success("Alert removed");
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="w-full max-w-[1500px]">
      <AdminPageHeader
        eyebrow="Content & moderation"
        title="Hazard alerts"
        description="Adjust severity or remove alerts that are spam, duplicate or resolved."
        websiteHref="/alerts"
        actions={
          <a className={buttonVariants({ size: "sm" })} href="/admin/alerts/new"><Plus className="mr-1.5 size-4" /> Add new alert</a>
        }
      />

      <div className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>County</Label>
          <Select value={county} onValueChange={setCounty}>
            <SelectTrigger className="w-44">
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
        <div>
          <Label>Hazard type</Label>
          <Select value={hazard} onValueChange={setHazard}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All hazard types</SelectItem>
              {hazardTypes.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {severities.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1">
          <Label htmlFor="alert-search">Search</Label>
          <Input
            id="alert-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description…"
          />
        </div>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}

      <AdminListingSurface className="mt-0">
          <Table className="w-full min-w-0 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><span className="sr-only">Select</span></TableHead>
              <TableHead>Image</TableHead>
              <TableHead className="w-[24%]">Alert</TableHead>
              <TableHead className="w-[10%]">County</TableHead>
              <TableHead className="w-[11%]">Severity</TableHead>
              <TableHead className="w-[10%]">Status</TableHead>
              <TableHead className="w-[13%]">Reported by</TableHead>
              <TableHead className="w-[8%]">Views</TableHead>
              <TableHead className="w-[12%]">Posted</TableHead>
              <TableHead className="w-[12%] whitespace-nowrap text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="w-10"><input type="checkbox" aria-label={`Select ${a.title}`} className="size-4 accent-brand-blue" /></TableCell>
                <TableCell>
                  {a.image_url ? <img src={a.image_url} alt="" className="size-12 rounded object-cover" /> : <div className="size-12 rounded bg-muted" aria-label="No featured image" />}
                </TableCell>
                <TableCell className="max-w-0 break-words">
                  <Link
                    to="/alerts/$alertId"
                    params={{ alertId: a.id }}
                    className="font-semibold text-brand-blue hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{a.hazard_type.replace("_", " ")}</p>
                </TableCell>
                <TableCell className="break-words">{a.county}</TableCell>
                <TableCell className="break-words">
                  <Select
                    value={a.severity}
                    onValueChange={(v) => setSeverityMutation.mutate({ id: a.id, severity: v })}
                  >
                    <SelectTrigger className="w-32">
                      <SeverityBadge value={a.severity} />
                    </SelectTrigger>
                    <SelectContent>
                      {severities.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-xs font-semibold capitalize text-muted-foreground">{a.status.replace("_", " ")}</TableCell>
                <TableCell className="max-w-0 break-words">
                  <UserLink userId={a.user_id} name={names[a.user_id]} anonymous={a.is_anonymous} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye className="size-3" /> {viewCountsError ? "—" : viewCounts[a.id] ?? 0}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {dateTime(a.created_at)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button asChild variant="outline" size="sm"><a href={`/admin/alerts/${a.id}/edit`}><Pencil className="mr-1.5 size-4" /> Edit</a></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
                      <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/alerts/$alertId" params={{ alertId: a.id }} target="_blank">
                          <ExternalLink className="mr-2 size-4" /> View on website
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild><a href={`/admin/alerts/${a.id}/edit`}><Pencil className="mr-2 size-4" /> Edit alert</a></DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFeaturedMutation.mutate({ id: a.id, featured: !Boolean((a as { featured?: boolean | null }).featured) })}>
                        <Sparkles className="mr-2 size-4" /> {Boolean((a as { featured?: boolean | null }).featured) ? "Remove from Featured" : "Set as Featured"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => remove.mutate(a.id)}
                      >
                        <Trash2 className="mr-2 size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  Nothing matches these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </AdminListingSurface>

    </div>
  );
}
