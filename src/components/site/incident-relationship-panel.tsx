import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Unlink2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type IncidentSuggestion = {
  id: string;
  candidate_type: string;
  candidate_id: string;
  target_type: string;
  target_id: string;
  confidence: number;
  reasons: string[] | null;
};

type AlertRow = { id: string; title: string; county: string; road: string | null; status: string; created_at: string };
type ReportRow = { id: string; title: string; county: string; road: string | null; status: string; occurred_at: string };
type LinkRow = { id: string; content_id: string; canonical_report_id: string; review_note: string; reviewed_at: string };

const relationKey = ["admin-incident-relationships"];

function isMissingDuplicateColumn(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "");
  return /duplicate_of_report_id|column .* does not exist|schema cache/i.test(message);
}

function isAlertReportSuggestion(item: IncidentSuggestion) {
  return (
    (item.candidate_type === "alert" && item.target_type === "report") ||
    (item.candidate_type === "report" && item.target_type === "alert")
  );
}

function pairFor(item: IncidentSuggestion) {
  return item.candidate_type === "alert"
    ? { alertId: item.candidate_id, reportId: item.target_id }
    : { alertId: item.target_id, reportId: item.candidate_id };
}

export function IncidentRelationshipPanel() {
  const queryClient = useQueryClient();
  const [alertId, setAlertId] = useState("");
  const [reportId, setReportId] = useState("");
  const [replacementReports, setReplacementReports] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const alerts = useQuery({
    queryKey: [...relationKey, "alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("id,title,county,road,status,created_at").order("created_at", { ascending: false }).limit(250);
      if (error) throw error;
      return (data ?? []) as AlertRow[];
    },
  });
  const reports = useQuery({
    queryKey: [...relationKey, "reports"],
    queryFn: async () => {
      let { data, error } = await (supabase.from("accident_reports") as any).select("id,title,county,road,status,occurred_at,duplicate_of_report_id").eq("status", "approved").is("duplicate_of_report_id", null).order("occurred_at", { ascending: false }).limit(250);
      if (error && isMissingDuplicateColumn(error)) {
        const legacy = await (supabase.from("accident_reports") as any).select("id,title,county,road,status,occurred_at").eq("status", "approved").order("occurred_at", { ascending: false }).limit(250);
        data = legacy.data;
        error = legacy.error;
      }
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });
  const links = useQuery({
    queryKey: [...relationKey, "links"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incident_content_links") as any).select("id,content_id,canonical_report_id,review_note,reviewed_at").eq("content_type", "alert").eq("status", "confirmed").order("reviewed_at", { ascending: false }).limit(250);
      if (error) throw error;
      return (data ?? []) as LinkRow[];
    },
  });
  const suggestions = useQuery({
    queryKey: [...relationKey, "suggestions"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("incident_duplicate_suggestions") as any).select("id,candidate_type,candidate_id,target_type,target_id,confidence,reasons").eq("status", "suggested").order("confidence", { ascending: false }).limit(100);
      if (error) throw error;
      return ((data ?? []) as IncidentSuggestion[]).filter(isAlertReportSuggestion);
    },
  });

  const alertMap = useMemo(() => new Map((alerts.data ?? []).map((row) => [row.id, row])), [alerts.data]);
  const reportMap = useMemo(() => new Map((reports.data ?? []).map((row) => [row.id, row])), [reports.data]);
  const linkMap = useMemo(() => new Map((links.data ?? []).map((row) => [row.content_id, row])), [links.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: relationKey });
  };
  const confirmLink = useMutation({
    mutationFn: async ({ alertId: selectedAlertId, reportId: selectedReportId, suggestionId }: { alertId: string; reportId: string; suggestionId?: string }) => {
      const { error } = await (supabase as any).rpc("confirm_incident_content_link", { _alert_id: selectedAlertId, _canonical_report_id: selectedReportId, _suggestion_id: suggestionId ?? null, _note: "Confirmed during editorial relationship review." });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Alert linked to the approved canonical report"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const rejectSuggestion = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { error } = await (supabase as any).rpc("reject_incident_relationship_suggestion", { _suggestion_id: suggestionId, _note: "Rejected during editorial relationship review." });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Relationship suggestion rejected"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const correctLink = useMutation({
    mutationFn: async ({ linkId, replacementReportId, note }: { linkId: string; replacementReportId: string; note: string }) => {
      if (!replacementReportId || !note.trim()) throw new Error("Choose an approved replacement and enter a correction note");
      const { error } = await (supabase as any).rpc("correct_incident_content_link", { _link_id: linkId, _canonical_report_id: replacementReportId, _note: note });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Relationship corrected"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });
  const revokeLink = useMutation({
    mutationFn: async ({ linkId, note }: { linkId: string; note: string }) => {
      if (!note.trim()) throw new Error("Enter a revocation note");
      const { error } = await (supabase as any).rpc("revoke_incident_content_link", { _link_id: linkId, _note: note });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Relationship revoked"); refresh(); },
    onError: (error: Error) => toast.error(error.message),
  });

  return <section className="mt-8 rounded-lg border border-border bg-card p-5 card-elevated" aria-labelledby="incident-relationships-heading">
    <div>
      <h2 id="incident-relationships-heading" className="flex items-center gap-2 font-bold"><Link2 className="size-5 text-accent" /> Alert-to-Report relationships</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Confirm only evidence-reviewed matches. Similar headlines, dates or locations create suggestions, never automatic links. Each Alert can have at most one confirmed canonical Accident Report.</p>
    </div>

    <div className="mt-5 rounded border border-border p-3">
      <h3 className="font-semibold">Link existing records</h3>
      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <select aria-label="Alert to link" value={alertId} onChange={(event) => setAlertId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Choose an Alert</option>
          {(alerts.data ?? []).filter((row) => !linkMap.has(row.id)).map((row) => <option key={row.id} value={row.id}>{row.title} · {row.county}</option>)}
        </select>
        <select aria-label="Approved report to link" value={reportId} onChange={(event) => setReportId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
          <option value="">Choose an approved Accident Report</option>
          {(reports.data ?? []).map((row) => <option key={row.id} value={row.id}>{row.title} · {row.county}</option>)}
        </select>
        <Button type="button" disabled={!alertId || !reportId || confirmLink.isPending} onClick={() => confirmLink.mutate({ alertId, reportId })}><Link2 className="mr-1.5 size-4" />Confirm link</Button>
      </div>
    </div>

    {suggestions.data?.length ? <div className="mt-5 space-y-3"><h3 className="font-semibold">Suggested relationships awaiting review</h3>{suggestions.data.map((suggestion) => { const pair = pairFor(suggestion); const alert = alertMap.get(pair.alertId); const report = reportMap.get(pair.reportId); return <article key={suggestion.id} className="rounded border border-amber-200 bg-amber-50/50 p-3"><div className="grid gap-1 text-sm sm:grid-cols-2"><a className="font-semibold underline" href={`/alerts/${pair.alertId}`}>{alert?.title ?? "Alert record"}</a><a className="font-semibold underline" href={`/reports/${pair.reportId}`}>{report?.title ?? "Accident Report record"}</a></div><p className="mt-1 text-xs text-muted-foreground">{Math.round(Number(suggestion.confidence) * 100)}% suggestion · {(suggestion.reasons ?? []).join(" · ") || "Evidence requires editorial review."}</p><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={() => confirmLink.mutate({ alertId: pair.alertId, reportId: pair.reportId, suggestionId: suggestion.id })}><Link2 className="mr-1 size-3" />Confirm relationship</Button><Button size="sm" variant="ghost" onClick={() => rejectSuggestion.mutate(suggestion.id)}><XCircle className="mr-1 size-3" />Reject suggestion</Button></div></article>; })}</div> : null}

    {suggestions.error || links.error ? <p className="mt-4 rounded border border-dashed border-border p-3 text-sm text-muted-foreground">Relationship review is unavailable until the additive incident-content-links migration is approved and applied to this database.</p> : null}

    {links.data?.length ? <div className="mt-5 space-y-3"><h3 className="font-semibold">Confirmed relationships</h3>{links.data.map((link) => { const alert = alertMap.get(link.content_id); const report = reportMap.get(link.canonical_report_id); return <article key={link.id} className="rounded border border-border p-3"><div className="grid gap-1 text-sm sm:grid-cols-2"><a className="font-semibold underline" href={`/alerts/${link.content_id}`}>{alert?.title ?? "Alert record"}</a><a className="font-semibold underline" href={`/reports/${link.canonical_report_id}`}>{report?.title ?? "Accident Report record"}</a></div><p className="mt-1 text-xs text-muted-foreground">Reviewed {new Date(link.reviewed_at).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}{link.review_note ? ` · ${link.review_note}` : ""}</p><div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"><select aria-label={`Replacement report for ${alert?.title ?? link.content_id}`} value={replacementReports[link.id] ?? ""} onChange={(event) => setReplacementReports((current) => ({ ...current, [link.id]: event.target.value }))} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="">Choose replacement report</option>{(reports.data ?? []).filter((row) => row.id !== link.canonical_report_id).map((row) => <option key={row.id} value={row.id}>{row.title} · {row.county}</option>)}</select><input aria-label={`Correction note for ${alert?.title ?? link.content_id}`} value={notes[link.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [link.id]: event.target.value }))} placeholder="Correction note" className="h-9 rounded-md border border-input bg-background px-2 text-sm" /><Button size="sm" variant="outline" disabled={!replacementReports[link.id] || correctLink.isPending} onClick={() => correctLink.mutate({ linkId: link.id, replacementReportId: replacementReports[link.id], note: notes[link.id] ?? "" })}>Correct</Button><Button size="sm" variant="ghost" disabled={revokeLink.isPending} onClick={() => revokeLink.mutate({ linkId: link.id, note: notes[link.id] ?? "Relationship was not supported by review evidence." })}><Unlink2 className="mr-1 size-3" />Revoke</Button></div></article>; })}</div> : null}
  </section>;
}
