import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Proposal = { id: string; source_url: string; source_organization: string | null; evidence_excerpt: string | null; proposed_update: Record<string, unknown>; status: string; created_at: string };

export function StatisticsProposalsPanel() {
  const queryClient = useQueryClient();
  const [sourceUrl, setSourceUrl] = useState("");
  const [organization, setOrganization] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [proposedUpdate, setProposedUpdate] = useState('{"metric":"fatalities","value":null,"period":""}');
  const queryKey = ["admin-statistics-proposals"];
  const proposals = useQuery<Proposal[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase.from("statistics_update_proposals") as any)
        .select("id,source_url,source_organization,evidence_excerpt,proposed_update,status,created_at")
        .order("created_at", { ascending: false }).limit(50);
      if (error) {
        if (/statistics_update_proposals|relation|does not exist/i.test(error.message ?? "")) return [];
        throw error;
      }
      return (data ?? []) as Proposal[];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!/^https?:\/\//i.test(sourceUrl.trim())) throw new Error("Add an http(s) source URL");
      let update: Record<string, unknown>;
      try { update = JSON.parse(proposedUpdate) as Record<string, unknown>; } catch { throw new Error("Proposed update must be valid JSON"); }
      if (!update || Array.isArray(update)) throw new Error("Proposed update must be a JSON object");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase.from("statistics_update_proposals") as any).insert({ source_url: sourceUrl.trim(), source_organization: organization.trim() || null, evidence_excerpt: excerpt.trim() || null, proposed_update: update, proposed_by: auth.user?.id });
      if (error) throw error;
    },
    onSuccess: () => { setSourceUrl(""); setOrganization(""); setExcerpt(""); toast.success("Statistics proposal submitted for review"); void queryClient.invalidateQueries({ queryKey }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "accepted" | "rejected" }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await (supabase.from("statistics_update_proposals") as any).update({ status, reviewed_by: auth.user?.id, reviewed_at: new Date().toISOString(), review_notes: status === "accepted" ? "Accepted for separate editorial implementation." : "Rejected during editorial review." }).eq("id", id).eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Proposal review saved"); void queryClient.invalidateQueries({ queryKey }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <section className="mt-8 rounded-lg border border-border bg-card p-5" aria-labelledby="statistics-proposals-heading">
    <h2 id="statistics-proposals-heading" className="text-lg font-bold">Statistics evidence proposals</h2>
    <p className="mt-1 text-sm text-muted-foreground">Record a source and proposed value for human review. Accepted proposals do not publish or alter statistics automatically.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://official-source.example/data" aria-label="Statistics source URL" />
      <Input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder="Source organization" aria-label="Statistics source organization" />
    </div>
    <Textarea className="mt-3" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={3} placeholder="Short evidence excerpt or notes (not instructions)" aria-label="Statistics evidence excerpt" />
    <Textarea className="mt-3 font-mono text-xs" value={proposedUpdate} onChange={(event) => setProposedUpdate(event.target.value)} rows={4} aria-label="Proposed statistics update JSON" />
    <Button className="mt-3" disabled={create.isPending || !sourceUrl.trim()} onClick={() => create.mutate()}>{create.isPending ? "Submitting…" : "Submit proposal"}</Button>
    {proposals.error ? <p className="mt-4 rounded border border-caution/40 bg-caution/10 p-3 text-sm text-muted-foreground">Statistics proposal storage is unavailable until the review migration is applied.</p> : null}
    <div className="mt-5 space-y-3">{(proposals.data ?? []).map((proposal) => <article key={proposal.id} className="rounded border border-border p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><a href={proposal.source_url} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-semibold text-brand-blue underline">{proposal.source_url}</a><p className="mt-1 text-xs text-muted-foreground">{proposal.source_organization ?? "Source organization not recorded"} · {proposal.status}</p></div>{proposal.status === "pending" ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => review.mutate({ id: proposal.id, status: "rejected" })}>Reject</Button><Button size="sm" onClick={() => review.mutate({ id: proposal.id, status: "accepted" })}>Accept for implementation</Button></div> : null}</div>{proposal.evidence_excerpt ? <p className="mt-2 text-sm text-muted-foreground">{proposal.evidence_excerpt}</p> : null}<pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(proposal.proposed_update, null, 2)}</pre></article>)}{!proposals.isLoading && !proposals.error && !(proposals.data ?? []).length ? <p className="mt-4 text-sm text-muted-foreground">No evidence proposals yet.</p> : null}</div>
  </section>;
}
