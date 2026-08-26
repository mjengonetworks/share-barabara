import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  MoreVertical,
  Pencil,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { useViewCounts } from "@/hooks/useViewCounts";
import { UserLink } from "@/components/site/user-link";
import { SeverityBadge } from "@/components/site/severity-badge";
import { dateTime } from "@/lib/format";
import { KENYA_COUNTIES, REPORT_SEVERITIES } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Accident Reports: Share Barabara Admin" }] }),
  component: ReportsQueuePage,
});

type ReportDraft = {
  title: string;
  description: string;
  county: string;
  road: string;
  severity: string;
  vehicles_involved: number;
  casualties: number;
  fatalities: number;
  editor_note: string;
};
type Status = "pending" | "approved" | "rejected";

function ReportsQueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<Status | "all">("pending");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ReportDraft>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: allReports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accident_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const reports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allReports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (countyFilter !== "all" && r.county !== countyFilter) return false;
      if (q && !r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [allReports, statusFilter, severityFilter, countyFilter, search]);

  const { data: names = {} } = useProfileNames(reports.map((r) => r.user_id));
  const { data: viewCounts = {} } = useViewCounts(
    "accident_report_views",
    "report_id",
    reports.map((r) => r.id),
  );

  const save = useMutation({
    mutationFn: async ({
      id,
      status,
      draft,
    }: {
      id: string;
      status: "approved" | "rejected" | "pending";
      draft?: ReportDraft;
    }) => {
      const patch = {
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        ...(draft ?? {}),
      };
      const { error } = await supabase.from("accident_reports").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report updated");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accident_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report deleted");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Moderation queue
      </p>
      <h1 className="mt-1 text-3xl font-extrabold">Accident reports</h1>
      <p className="mt-2 text-muted-foreground">
        Edit submissions for accuracy and clarity, then approve them.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Severity</Label>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {REPORT_SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>County</Label>
          <Select value={countyFilter} onValueChange={setCountyFilter}>
            <SelectTrigger className="w-40">
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
        <div className="min-w-48 flex-1">
          <Label htmlFor="report-search">Search</Label>
          <Input
            id="report-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or description…"
          />
        </div>
      </div>

      {isLoading ? <p className="mt-8 text-muted-foreground">Loading…</p> : null}
      {!isLoading && reports.length === 0 ? (
        <p className="mt-8 rounded border border-dashed border-border p-8 text-center text-muted-foreground">
          Nothing matches these filters.
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {reports.map((r) => {
          const d: ReportDraft = drafts[r.id] ?? {
            title: r.title,
            description: r.description,
            county: r.county,
            road: r.road ?? "",
            severity: r.severity,
            vehicles_involved: r.vehicles_involved,
            casualties: r.casualties,
            fatalities: r.fatalities,
            editor_note: r.editor_note ?? "",
          };
          const set = (patch: Partial<ReportDraft>) =>
            setDrafts((prev) => ({ ...prev, [r.id]: { ...d, ...patch } }));
          const expanded = expandedId === r.id;

          return (
            <li key={r.id} className="rounded-lg border border-border bg-card card-elevated">
              <div className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt=""
                      className="size-14 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded bg-muted">
                      <ShieldAlert className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge value={r.severity} />
                      <p className="truncate font-semibold">{r.title}</p>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span>
                        Filed by <UserLink userId={r.user_id} name={names[r.user_id]} />
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        · <Eye className="size-3" /> {viewCounts[r.id] ?? 0}
                      </span>
                      <span>· {dateTime(r.created_at)}</span>
                    </p>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/reports/$reportId" params={{ reportId: r.id }} target="_blank">
                        <ExternalLink className="mr-2 size-4" /> View on website
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setExpandedId(r.id)}>
                      <Pencil className="mr-2 size-4" /> Edit
                    </DropdownMenuItem>
                    {r.status !== "approved" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: r.id, status: "approved" })}
                      >
                        Approve &amp; publish
                      </DropdownMenuItem>
                    ) : null}
                    {r.status !== "rejected" ? (
                      <DropdownMenuItem
                        onClick={() => save.mutate({ id: r.id, status: "rejected" })}
                      >
                        Reject
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => remove.mutate(r.id)}
                    >
                      <Trash2 className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  aria-label={expanded ? "Collapse" : "Expand"}
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="shrink-0 text-muted-foreground"
                >
                  {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>

              {expanded ? (
                <div className="border-t border-border p-5">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`t-${r.id}`}>Summary</Label>
                      <Input
                        id={`t-${r.id}`}
                        value={d.title}
                        onChange={(e) => set({ title: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>County</Label>
                        <Select value={d.county} onValueChange={(v) => set({ county: v })}>
                          <SelectTrigger>
                            <SelectValue />
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
                        <Label htmlFor={`rd-${r.id}`}>Road or location</Label>
                        <Input
                          id={`rd-${r.id}`}
                          value={d.road}
                          onChange={(e) => set({ road: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Severity</Label>
                        <Select value={d.severity} onValueChange={(v) => set({ severity: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REPORT_SEVERITIES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor={`v-${r.id}`}>Vehicles</Label>
                          <Input
                            id={`v-${r.id}`}
                            type="number"
                            min={0}
                            value={d.vehicles_involved}
                            onChange={(e) => set({ vehicles_involved: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`i-${r.id}`}>Injured</Label>
                          <Input
                            id={`i-${r.id}`}
                            type="number"
                            min={0}
                            value={d.casualties}
                            onChange={(e) => set({ casualties: Number(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`f-${r.id}`}>Deaths</Label>
                          <Input
                            id={`f-${r.id}`}
                            type="number"
                            min={0}
                            value={d.fatalities}
                            onChange={(e) => set({ fatalities: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`d-${r.id}`}>Report body</Label>
                      <Textarea
                        id={`d-${r.id}`}
                        rows={5}
                        value={d.description}
                        onChange={(e) => set({ description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`n-${r.id}`}>Editor's note (shown publicly)</Label>
                      <Textarea
                        id={`n-${r.id}`}
                        rows={2}
                        value={d.editor_note}
                        onChange={(e) => set({ editor_note: e.target.value })}
                        placeholder="Verification details, corrections or context added during review."
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      disabled={save.isPending}
                      onClick={() => save.mutate({ id: r.id, status: "approved", draft: d })}
                    >
                      Approve &amp; publish
                    </Button>
                    <Button
                      variant="outline"
                      disabled={save.isPending}
                      onClick={() => save.mutate({ id: r.id, status: r.status as never, draft: d })}
                    >
                      Save edits
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={save.isPending}
                      onClick={() => save.mutate({ id: r.id, status: "rejected", draft: d })}
                    >
                      Reject
                    </Button>
                    {r.status !== "pending" ? (
                      <Button
                        variant="ghost"
                        disabled={save.isPending}
                        onClick={() => save.mutate({ id: r.id, status: "pending" })}
                      >
                        Send back to pending
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
