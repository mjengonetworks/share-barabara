import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Eye, MoreVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PartyCasualtyInputs,
  type CasualtyBreakdown,
} from "@/components/site/party-casualty-inputs";
import { supabase } from "@/integrations/supabase/client";
import { moveToRecycleBin } from "@/lib/recycle-bin.mjs";
import { useProfileNames } from "@/lib/profiles";
import { UserLink } from "@/components/site/user-link";
import { SeverityBadge } from "@/components/site/severity-badge";
import { dateTime } from "@/lib/format";
import { KENYA_COUNTIES, PARTIES_INVOLVED } from "@/lib/constants";
import { findExistingRoad } from "@/lib/roads";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import { useHazardTypes, useAlertSeverities } from "@/hooks/useTaxonomy";
import { useViewCounts } from "@/hooks/useViewCounts";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";
import { LocationButton } from "@/components/site/location-button";
import { EditorialUpdatesManager } from "@/components/site/editorial-updates-manager";

export const Route = createFileRoute("/_authenticated/admin/alerts")({
  head: () => ({ meta: [{ title: "Hazard Alerts: Share Barabara Admin" }] }),
  component: AlertsAdminPage,
});

function AlertsAdminPage() {
  const queryClient = useQueryClient();
  const { data: hazardTypes = [] } = useHazardTypes();
  const { data: severities = [] } = useAlertSeverities();
  const [county, setCounty] = useState("all");
  const [hazard, setHazard] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [editingParties, setEditingParties] = useState<{
    id: string;
    title: string;
    description: string;
    county: string;
    road: string;
    latitude: number | null;
    longitude: number | null;
    hazard_type: string;
    severity: string;
    parties: string[];
    casualties: CasualtyBreakdown;
  } | null>(null);

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
      if (q && !a.title.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [allAlerts, county, hazard, severity, search]);

  const { data: names = {} } = useProfileNames(alerts.map((a) => a.user_id));
  const { data: viewCounts = {} } = useViewCounts(
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

  const saveParties = useMutation({
    mutationFn: async () => {
      if (!editingParties) return;
      const road_id = await findExistingRoad(editingParties.road);
      const { error } = await supabase
        .from("alerts")
        .update({
          title: editingParties.title.trim(),
          description: editingParties.description,
          county: editingParties.county,
          road: editingParties.road.trim() || null,
          latitude: editingParties.latitude,
          longitude: editingParties.longitude,
          road_id,
          hazard_type: editingParties.hazard_type,
          severity: editingParties.severity,
          parties_involved: editingParties.parties,
          casualty_breakdown: editingParties.casualties,
        })
        .eq("id", editingParties.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      setEditingParties(null);
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-[1.44375rem] font-extrabold">Hazard alerts</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Adjust severity or remove alerts that are spam, duplicate or resolved.
      </p>
      <Button asChild className="mt-4">
        <Link to="/alerts"><Plus className="mr-1.5 size-4" /> Add new alert</Link>
      </Button>

      <div className="mt-6 flex flex-wrap items-end gap-3">
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

      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alert</TableHead>
              <TableHead>County</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Reported by</TableHead>
              <TableHead>Views</TableHead>
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
                <TableCell>
                  <UserLink userId={a.user_id} name={names[a.user_id]} anonymous={a.is_anonymous} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Eye className="size-3" /> {viewCounts[a.id] ?? 0}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {dateTime(a.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/alerts/$alertId" params={{ alertId: a.id }} target="_blank">
                          <ExternalLink className="mr-2 size-4" /> View on website
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditingParties({
                            id: a.id,
                            title: a.title,
                            description: a.description,
                            county: a.county,
                            road: a.road ?? "",
                            latitude: a.latitude,
                            longitude: a.longitude,
                            hazard_type: a.hazard_type,
                            severity: a.severity,
                            parties: a.parties_involved ?? [],
                            casualties: (a.casualty_breakdown as CasualtyBreakdown | null) ?? {},
                          })
                        }
                      >
                        Edit alert
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
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nothing matches these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingParties} onOpenChange={(v) => !v && setEditingParties(null)}>
        <DialogContent>
          <DialogHeader>
          <DialogTitle>Edit alert</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Correct the alert details and, where verified, classify the people involved. Existing
            fields and the current alert schema are reused.
          </p>
          {editingParties ? (
            <>
              {(["generate", "autopopulate"] as const).map((mode) => (
                <EditorialAIButton
                  key={mode}
                  contentType="alert"
                  mode={mode}
                  source={`${editingParties.title}\n${editingParties.description}\nCounty: ${editingParties.county}\nRoad: ${editingParties.road}`}
                  onDraft={(draft) =>
                    setEditingParties((current) =>
                      current
                        ? {
                            ...current,
                            ...(typeof draft.title === "string" ? { title: draft.title } : {}),
                            ...(typeof draft.description === "string" ? { description: draft.description } : {}),
                            ...(typeof draft.county === "string" ? { county: draft.county } : {}),
                            ...(typeof draft.road === "string" ? { road: draft.road } : {}),
                            ...(typeof draft.hazard_type === "string" ? { hazard_type: draft.hazard_type } : {}),
                            ...(typeof draft.severity === "string" ? { severity: draft.severity } : {}),
                          }
                        : current,
                    )
                  }
                />
              ))}
              <EditorialAIButton
                contentType="alert"
                mode="update"
                contentId={editingParties.id}
                source=""
                current={editingParties}
                onDraft={(draft) =>
                  setEditingParties((current) =>
                    current
                      ? {
                          ...current,
                          ...(typeof draft.title === "string" ? { title: draft.title } : {}),
                          ...(typeof draft.description === "string" ? { description: draft.description } : {}),
                          ...(typeof draft.county === "string" ? { county: draft.county } : {}),
                          ...(typeof draft.road === "string" ? { road: draft.road } : {}),
                          ...(typeof draft.hazard_type === "string" ? { hazard_type: draft.hazard_type } : {}),
                          ...(typeof draft.severity === "string" ? { severity: draft.severity } : {}),
                        }
                      : current,
                  )
                }
              />
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-alert-title">Title</Label>
                  <Input id="edit-alert-title" value={editingParties.title} onChange={(e) => setEditingParties({ ...editingParties, title: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="edit-alert-description">Details</Label>
                  <RichTextEditor id="edit-alert-description" rows={6} value={editingParties.description} onChange={(v) => setEditingParties({ ...editingParties, description: v })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>County</Label>
                    <Select value={editingParties.county} onValueChange={(v) => setEditingParties({ ...editingParties, county: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">{KENYA_COUNTIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-alert-road">Road or location</Label>
                    <Input id="edit-alert-road" value={editingParties.road} onChange={(e) => setEditingParties({ ...editingParties, road: e.target.value })} />
                  </div>
                </div>
                <div className="rounded border border-dashed border-border bg-muted/30 p-3">
                  <Label>Point location (optional)</Label>
                  <LocationButton idPrefix="edit-alert-location" latitude={editingParties.latitude} longitude={editingParties.longitude} onLocate={(latitude, longitude) => setEditingParties({ ...editingParties, latitude, longitude })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Hazard type</Label>
                    <Select value={editingParties.hazard_type} onValueChange={(v) => setEditingParties({ ...editingParties, hazard_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{hazardTypes.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={editingParties.severity} onValueChange={(v) => setEditingParties({ ...editingParties, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{severities.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {PARTIES_INVOLVED.map((p) => (
                  <label key={p.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={editingParties.parties.includes(p.value)}
                      onCheckedChange={(v) =>
                        setEditingParties({
                          ...editingParties,
                          parties:
                            v === true
                              ? [...editingParties.parties, p.value]
                              : editingParties.parties.filter((x) => x !== p.value),
                        })
                      }
                    />
                    {p.label}
                  </label>
                ))}
              </div>
              <PartyCasualtyInputs
                parties={editingParties.parties}
                value={editingParties.casualties}
                onChange={(v) => setEditingParties({ ...editingParties, casualties: v })}
              />
              <EditorialUpdatesManager
                parentType="alert"
                parentId={editingParties.id}
                parentTitle={editingParties.title}
                parentBody={editingParties.description}
              />
              <Button disabled={saveParties.isPending} onClick={() => saveParties.mutate()}>
                {saveParties.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
