import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type OfficialDraft = { title: string; metric: string; source: string; url: string; start: string; end: string; value: string };
const initial: OfficialDraft = { title: "", metric: "deaths", source: "", url: "", start: "", end: "", value: "" };

/** Admin-only workflow backed by the reviewed provenance migration. Legacy aggregate tables are not edited here. */
export function OfficialStatisticsManager() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OfficialDraft>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const { data: datasets = [], isError } = useQuery({
    queryKey: ["admin-official-statistics"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("statistics_datasets") as any)
        .select("id,title,metric_type,source_organization,source_url,reporting_period_start,reporting_period_end,publication_status,last_verified_at,statistics_observations(id,value,record_status)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await (supabase.rpc as any)("update_official_statistics_dataset", {
          _dataset_id: editingId, _title: draft.title.trim(), _source_organization: draft.source.trim(),
          _source_url: draft.url.trim() || null, _source_document_url: draft.url.trim() || null,
          _reporting_period_start: draft.start, _reporting_period_end: draft.end,
          _methodology: "Source-backed official series", _notes: null,
        });
        if (error) throw error;
        return;
      }
      const { data: dataset, error } = await (supabase.rpc as any)("create_official_statistics_dataset", {
        _title: draft.title.trim(), _metric_type: draft.metric, _unit: "count", _geography_level: "national",
        _source_organization: draft.source.trim(), _source_url: draft.url.trim() || null, _source_document_url: draft.url.trim() || null,
        _reporting_period_start: draft.start, _reporting_period_end: draft.end, _methodology: "Source-backed official series", _notes: null,
      });
      if (error) throw error;
      const { error: observationError } = await (supabase.rpc as any)("create_official_statistics_observation", {
        _dataset_id: dataset, _period_kind: draft.start === draft.end ? "point_in_time" : "date_range",
        _period_start: draft.start, _period_end: draft.end, _value: Number(draft.value), _verification_status: "provisional", _notes: null,
      });
      if (observationError) throw observationError;
    },
    onSuccess: () => { toast.success(editingId ? "Official dataset updated" : "Official statistics draft created"); setDraft(initial); setEditingId(null); queryClient.invalidateQueries({ queryKey: ["admin-official-statistics"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const publish = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.rpc as any)("publish_official_statistics_dataset", { _dataset_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Official dataset published"); queryClient.invalidateQueries({ queryKey: ["admin-official-statistics"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const unpublish = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase.rpc as any)("unpublish_official_statistics_dataset", { _dataset_id: id }); if (error) throw error; },
    onSuccess: () => { toast.success("Official dataset unpublished"); queryClient.invalidateQueries({ queryKey: ["admin-official-statistics"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const correct = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await (supabase.rpc as any)("correct_official_statistics_observation", { _observation_id: id, _value: Number(value), _verification_status: "provisional", _notes: "Admin correction" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Correction published as a new revision"); setCorrections({}); queryClient.invalidateQueries({ queryKey: ["admin-official-statistics"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Admin-managed official statistics</p>
      <h2 className="mt-1 text-lg font-bold">Source-backed national series</h2>
      <p className="mt-2 text-sm text-muted-foreground">Create drafts with a distinct metric, reporting period and provenance. Published observations are immutable; corrections require a new revision.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(["title", "source", "url", "start", "end", "value"] as const).map((key) => <Input key={key} placeholder={key === "url" ? "Source URL" : key} type={key === "value" ? "number" : key === "start" || key === "end" ? "date" : "text"} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />)}
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })}><option value="deaths">Fatalities</option><option value="serious_injuries">Serious injuries</option><option value="slight_injuries">Slight injuries</option><option value="total_injuries">Total injuries</option><option value="crashes">Crashes</option></select>
        <Button disabled={create.isPending || !draft.title || !draft.source || !draft.start || !draft.end || (!editingId && !draft.value)} onClick={() => create.mutate()}>{editingId ? "Save changes" : "Create draft"}</Button>
        {editingId ? <Button variant="ghost" onClick={() => { setEditingId(null); setDraft(initial); }}>Cancel</Button> : null}
      </div>
      {isError ? <p className="mt-3 text-sm text-muted-foreground">The official-statistics migration is not active in this environment yet.</p> : <div className="mt-4 divide-y divide-border">{datasets.map((dataset: any) => { const observation = (dataset.statistics_observations ?? []).find((row: any) => row.record_status === "published"); return <div key={dataset.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span><strong>{dataset.title}</strong> · {dataset.metric_type} · {dataset.source_organization}<span className="ml-2 text-muted-foreground">{dataset.publication_status}{observation ? ` · ${observation.value}` : ""}</span></span><span className="flex flex-wrap items-center gap-2">{dataset.publication_status === "draft" ? <Button size="sm" variant="outline" onClick={() => publish.mutate(dataset.id)}>Publish</Button> : null}{dataset.publication_status === "published" ? <><Input className="h-8 w-24" type="number" placeholder="Correct value" value={corrections[dataset.id] ?? ""} onChange={(event) => setCorrections({ ...corrections, [dataset.id]: event.target.value })} /><Button size="sm" variant="outline" disabled={!observation || !corrections[dataset.id]} onClick={() => correct.mutate({ id: observation?.id, value: corrections[dataset.id] })}>Correct</Button><Button size="sm" variant="ghost" onClick={() => unpublish.mutate(dataset.id)}>Unpublish</Button></> : null}<Button size="sm" variant="ghost" onClick={() => { setEditingId(dataset.id); setDraft({ title: dataset.title, metric: dataset.metric_type, source: dataset.source_organization, url: dataset.source_url ?? "", start: dataset.reporting_period_start ?? "", end: dataset.reporting_period_end ?? "", value: observation ? String(observation.value) : "" }); }}>Edit</Button></span></div>; })}</div>}
    </section>
  );
}
