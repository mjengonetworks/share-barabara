import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  MoreVertical,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { moveToRecycleBin } from "@/lib/recycle-bin.mjs";
import { useAuth } from "@/hooks/useAuth";
import { useProfileNames } from "@/lib/profiles";
import { useViewCounts } from "@/hooks/useViewCounts";
import { UserLink } from "@/components/site/user-link";
import { SeverityBadge } from "@/components/site/severity-badge";
import { RichTextEditor } from "@/components/site/rich-text-editor";
import {
  PartyCasualtyInputs,
  type CasualtyBreakdown,
} from "@/components/site/party-casualty-inputs";
import { dateTime } from "@/lib/format";
import { KENYA_COUNTIES, PARTIES_INVOLVED } from "@/lib/constants";
import { useReportSeverities } from "@/hooks/useTaxonomy";
import { EditorialAIButton } from "@/components/site/editorial-ai-button";
import { NullableNumberField } from "@/components/site/nullable-number-field";
import { casualtyBreakdownError } from "@/components/site/party-casualty-inputs";
import { LocationButton } from "@/components/site/location-button";
import { EditorialUpdatesManager } from "@/components/site/editorial-updates-manager";
import { IncidentDiscoveryPanel } from "@/components/site/incident-discovery-panel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminListingHeader, AdminListingSurface } from "@/components/admin/admin-listing-surface";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Accident Reports: Share Barabara Admin" }] }),
  component: ReportsQueuePage,
});

type ReportDraft = {
  title: string;
  description: string;
  county: string;
  road: string;
  latitude: number | null;
  longitude: number | null;
  severity: string;
  vehicles_involved: number | null;
  casualties: number | null;
  fatalities: number | null;
  editor_note: string;
  image_alt: string;
  image_caption: string;
  image_credit: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  parties_involved: string[];
  casualty_breakdown: CasualtyBreakdown;
};
type Status = "pending" | "approved" | "rejected";

function ReportsQueuePage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (/^\/admin\/reports\/(?:new|[^/]+\/edit)\/?$/.test(pathname)) return <Outlet />;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: severities = [] } = useReportSeverities();
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ReportDraft>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [canonicalIds, setCanonicalIds] = useState<Record<string, string>>({});

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
  const { data: viewCounts = {}, isError: viewCountsError } = useViewCounts(
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
      if (draft) {
        const breakdownError = casualtyBreakdownError(draft.casualty_breakdown, {
          dead: draft.fatalities,
          injured: draft.casualties,
        });
        if (breakdownError) throw new Error(breakdownError);
      }
      const patch = {
        status,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        ...(draft
          ? {
              ...draft,
              image_alt: draft.image_alt.trim() || null,
              image_caption: draft.image_caption.trim() || null,
              image_credit: draft.image_credit.trim() || null,
              seo_title: draft.seo_title.trim() || null,
              seo_description: draft.seo_description.trim() || null,
              seo_keywords: draft.seo_keywords.trim() || null,
            }
          : {}),
      };
      const { error } = await supabase.from("accident_reports").update(patch as never).eq("id", id);
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
      await moveToRecycleBin("report", id, "Removed by an administrator");
    },
    onSuccess: () => {
      toast.success("Report deleted");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mergeDuplicate = useMutation({
    mutationFn: async ({ duplicateId, canonicalId }: { duplicateId: string; canonicalId: string }) => {
      if (!canonicalId || canonicalId === duplicateId) throw new Error("Choose a different approved canonical report.");
      const { error } = await (supabase.rpc as any)("merge_duplicate_report", {
        _duplicate_report_id: duplicateId,
        _canonical_report_id: canonicalId,
        _note: "Duplicate report merged into the approved canonical incident.",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Duplicate merged into the canonical report");
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="w-full max-w-[1500px]">
      <AdminPageHeader
        eyebrow="Content & moderation"
        title="Manage Accident Reports"
        description="Edit submissions for accuracy and clarity, then approve them."
        websiteHref="/reports"
        actions={
          <Button asChild size="sm"><Link to="/admin/reports/new"><Plus className="mr-1.5 size-4" /> Add New Report</Link></Button>
        }
      />
      <IncidentDiscoveryPanel />

      <div className="mt-4 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
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
              {severities.map((s) => (
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
        <div className="min-w-48 flex-1 sm:col-span-2 lg:col-span-4">
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

      <AdminListingSurface>
        <AdminListingHeader><span>Image</span><span>Title</span><span>Location</span><span>Severity</span><span>Status</span><span>Author</span><span>Views</span><span>Created</span><span>Actions</span></AdminListingHeader>
      <ul className="divide-y divide-border/70">
        {reports.map((r) => {
          const d = (drafts[r.id] ?? {
            title: r.title,
            description: r.description,
            county: r.county,
            road: r.road ?? "",
            latitude: r.latitude,
            longitude: r.longitude,
            severity: r.severity,
            vehicles_involved: r.vehicles_involved,
            casualties: r.casualties,
            fatalities: r.fatalities,
            editor_note: r.editor_note ?? "",
            image_alt: r.image_alt ?? "",
            image_caption: r.image_caption ?? "",
            image_credit: r.image_credit ?? "",
            seo_title: r.seo_title ?? "",
            seo_description: r.seo_description ?? "",
            seo_keywords: r.seo_keywords ?? "",
            parties_involved: r.parties_involved ?? [],
            casualty_breakdown: (r.casualty_breakdown as CasualtyBreakdown | null) ?? {},
          }) as unknown as ReportDraft & Record<string, import("@/lib/ai/editorial.functions").EditorialValue>;
          const set = (patch: Partial<ReportDraft>) =>
            setDrafts((prev) => ({ ...prev, [r.id]: { ...d, ...patch } }));
          const applyAI = (draft: Record<string, unknown>) =>
            set(Object.fromEntries(Object.entries(draft).filter(([field, value]) => field in d && value !== null && value !== "")) as Partial<ReportDraft>);
          const expanded = expandedId === r.id;

          return (
            <li key={r.id} className="border-b border-border/70 odd:bg-background even:bg-muted/[0.18] last:border-b-0">
              <div className="grid grid-cols-[auto_56px_minmax(0,1fr)_auto_auto] items-center gap-2 p-3 sm:p-4 xl:grid-cols-[auto_56px_minmax(12rem,2fr)_minmax(7rem,1fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(4rem,auto)_minmax(7rem,auto)_auto]">
                <input type="checkbox" aria-label={`Select ${r.title}`} className="size-4 accent-brand-blue" onClick={(event) => event.stopPropagation()} />
                <div className="min-w-0 text-left">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-12 w-[70px] shrink-0 rounded bg-muted object-cover"
                    />
                  ) : (
                    <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                      <ShieldAlert className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  </div>
                  <div className="min-w-0 text-left">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold">{r.title}</p>
                  </div>
                  </div>

                <span className="hidden truncate text-sm xl:block">{r.county || "Not specified"}{r.road ? ` · ${r.road}` : ""}</span>
                <span className="hidden xl:block"><SeverityBadge value={r.severity} /></span>
                <span className="text-xs font-semibold capitalize text-muted-foreground">{r.status}</span>
                <span className="hidden min-w-0 truncate text-sm xl:block">{r.user_id ? <UserLink userId={r.user_id} name={names[r.user_id]} /> : "—"}</span>
                <span className="hidden items-center gap-1 text-xs text-muted-foreground xl:inline-flex"><Eye className="size-3" />{viewCountsError ? "—" : viewCounts[r.id] ?? 0}</span>
                <span className="hidden text-xs text-muted-foreground xl:block">{dateTime(r.created_at)}</span>
                <div className="flex items-center gap-1">
                <Button asChild variant="outline" size="sm" className="shrink-0"><a href={`/admin/reports/${r.id}/edit`}><Pencil className="mr-1.5 size-4" /> Edit</a></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="More actions">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/reports/$reportId" params={{ reportId: r.id }} target="_blank">
                        <ExternalLink className="mr-2 size-4" /> View on website
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={`/admin/reports/${r.id}/edit`}><Pencil className="mr-2 size-4" /> Edit</a>
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
                </div>
              </div>

              {expanded ? (
                <div className="border-t border-border p-5">
                  <div className="space-y-4">
                    {([{ mode: "generate", provider: "grok" }, { mode: "autopopulate", provider: "groq" }, { mode: "autopopulate", provider: "grok" }] as const).map(({ mode, provider }) => (
                      <EditorialAIButton
                        key={`${mode}-${provider}`}
                        contentType="report"
                        mode={mode}
                        provider={provider}
                        current={d}
                        source=""
                        onDraft={applyAI}
                      />
                    ))}
                    <EditorialAIButton
                      contentType="report"
                      source=""
                      mode="update"
                      contentId={r.id}
                      current={d}
                      onDraft={applyAI}
                    />
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
                            {severities.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2 rounded border border-dashed border-border bg-muted/30 p-3">
                        <Label>Point location (optional)</Label>
                        <LocationButton idPrefix={`report-${r.id}-location`} latitude={d.latitude} longitude={d.longitude} onLocate={(latitude, longitude) => set({ latitude, longitude })} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <NullableNumberField id={`v-${r.id}`} label="Vehicles" value={d.vehicles_involved} onChange={(value) => set({ vehicles_involved: value })} />
                        <NullableNumberField id={`i-${r.id}`} label="Injured" value={d.casualties} onChange={(value) => set({ casualties: value })} />
                        <NullableNumberField id={`f-${r.id}`} label="Deaths" value={d.fatalities} onChange={(value) => set({ fatalities: value })} />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`d-${r.id}`}>Report body</Label>
                      <RichTextEditor
                        id={`d-${r.id}`}
                        rows={10}
                        value={d.description}
                        onChange={(v) => set({ description: v })}
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
                    <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        SEO (optional, overrides defaults)
                      </p>
                      <div>
                        <Label htmlFor={`rseo-t-${r.id}`}>SEO title</Label>
                        <Input
                          id={`rseo-t-${r.id}`}
                          value={d.seo_title}
                          onChange={(e) => set({ seo_title: e.target.value })}
                          placeholder={r.title}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`rseo-d-${r.id}`}>SEO description</Label>
                        <Textarea
                          id={`rseo-d-${r.id}`}
                          rows={2}
                          value={d.seo_description}
                          onChange={(e) => set({ seo_description: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`rseo-k-${r.id}`}>SEO keywords</Label>
                        <Input
                          id={`rseo-k-${r.id}`}
                          value={d.seo_keywords}
                          onChange={(e) => set({ seo_keywords: e.target.value })}
                          placeholder="comma, separated, keywords"
                        />
                      </div>
                    </div>
                    <EditorialUpdatesManager
                      parentType="report"
                      parentId={r.id}
                      parentTitle={d.title}
                      parentBody={d.description}
                    />
                    <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Featured image details</p>
                      <div><Label htmlFor={`rimg-alt-${r.id}`}>Alt text</Label><Input id={`rimg-alt-${r.id}`} value={d.image_alt} onChange={(e) => set({ image_alt: e.target.value })} placeholder="Describes the image for screen readers and search engines" /></div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div><Label htmlFor={`rimg-cap-${r.id}`}>Caption</Label><Input id={`rimg-cap-${r.id}`} value={d.image_caption} onChange={(e) => set({ image_caption: e.target.value })} /></div>
                        <div><Label htmlFor={`rimg-cred-${r.id}`}>Credit / source</Label><Input id={`rimg-cred-${r.id}`} value={d.image_credit} onChange={(e) => set({ image_credit: e.target.value })} /></div>
                      </div>
                    </div>
                    <div className="space-y-3 rounded border border-dashed border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Who was involved
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Often left blank by the reporter, fill it in here from the write-up if you
                        know the breakdown, for accurate statistics.
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {PARTIES_INVOLVED.map((p) => (
                          <label key={p.value} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={d.parties_involved.includes(p.value)}
                              onCheckedChange={(v) =>
                                set({
                                  parties_involved:
                                    v === true
                                      ? [...d.parties_involved, p.value]
                                      : d.parties_involved.filter((x) => x !== p.value),
                                })
                              }
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                      <PartyCasualtyInputs
                        parties={d.parties_involved}
                        value={d.casualty_breakdown}
                        onChange={(v) => set({ casualty_breakdown: v })}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="flex min-w-64 flex-1 items-end gap-2 rounded border border-dashed border-border p-2">
                      <div className="min-w-0 flex-1"><Label>Duplicate of approved report</Label><Select value={canonicalIds[r.id] ?? "none"} onValueChange={(value) => setCanonicalIds((current) => ({ ...current, [r.id]: value === "none" ? "" : value }))}><SelectTrigger><SelectValue placeholder="Choose canonical report" /></SelectTrigger><SelectContent className="max-w-[32rem]"><SelectItem value="none">Not a duplicate</SelectItem>{allReports.filter((candidate) => candidate.id !== r.id && candidate.status === "approved").map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.title}</SelectItem>)}</SelectContent></Select></div><Button type="button" variant="outline" disabled={!canonicalIds[r.id] || mergeDuplicate.isPending} onClick={() => { if (window.confirm("Merge this report into the selected canonical incident? The duplicate will no longer publish.")) mergeDuplicate.mutate({ duplicateId: r.id, canonicalId: canonicalIds[r.id] }); }}>Merge</Button>
                    </div>
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
      </AdminListingSurface>
    </div>
  );
}
