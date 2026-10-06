import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEFAULT_QUERIES = [
  "Kenya road crash collision highway closure",
  "Kenya road flooding blocked road diversion safety",
  "Kenya road damage bridge collapse roadworks safety",
];

async function fingerprint(value: string) {
  const bytes = new TextEncoder().encode(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function duplicateScore(candidate: { title: string; excerpt: string }, report: { id: string; title: string; description: string | null; county: string | null; road: string | null }) {
  const candidateTerms = new Set(`${candidate.title} ${candidate.excerpt}`.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 4));
  const reportTerms = new Set(`${report.title} ${report.description ?? ""}`.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 4));
  const overlap = [...candidateTerms].filter((term) => reportTerms.has(term)).length;
  const textScore = overlap / Math.max(1, Math.min(candidateTerms.size, reportTerms.size));
  const haystack = `${candidate.title} ${candidate.excerpt}`.toLowerCase();
  const locationTerms = [report.county, report.road].filter(Boolean).map((value) => String(value).toLowerCase()).filter((value) => value.length >= 4);
  const locationScore = locationTerms.length > 0 && locationTerms.some((value) => haystack.includes(value)) ? 0.2 : 0;
  const score = Math.min(0.99, textScore * 0.8 + locationScore);
  return score >= 0.72 ? { id: report.id, score, reason: locationScore ? "Strong text overlap with a matching published location." : "Strong text overlap with an approved incident report." } : null;
}

export const discoverRoadSafetyCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data?: { queries?: string[]; sourceId?: string }; context: { supabase: any; userId: string } }) => {
    const { data: roles, error: rolesError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (rolesError) throw rolesError;
    if (!(roles ?? []).some((item: { role: string }) => item.role === "editor" || item.role === "admin")) throw new Error("Incident discovery requires an editor role.");
    const { searchExternal } = await import("@/lib/ai/external.server");
    const supabaseAdmin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    const sourceId = typeof data?.sourceId === "string" ? data.sourceId : null;
    let monitoredSources: Array<{ id: string; name: string; base_url: string; keywords: string[] }> = [];
    try {
      const sourceQuery = context.supabase.from("incident_monitor_sources").select("id,name,base_url,keywords").eq("enabled", true);
      const { data: rows, error } = sourceId ? await sourceQuery.eq("id", sourceId) : await sourceQuery;
      if (!error) monitoredSources = (rows ?? []) as typeof monitoredSources;
    } catch {
      // The additive operations migration may not be applied yet; fixed safe
      // queries remain available without pretending source monitoring exists.
    }
    const selectedSource = monitoredSources.find((source) => source.id === sourceId);
    const queries = (selectedSource?.keywords?.length ? selectedSource.keywords : Array.isArray(data?.queries) ? data!.queries : DEFAULT_QUERIES).map((query) => String(query).trim().slice(0, 180)).filter(Boolean).slice(0, 5);
    const startedAt = new Date().toISOString();
    let runId: string | null = null;
    if (selectedSource) {
      const { data: run } = await supabaseAdmin.from("incident_monitor_runs").insert({ source_id: selectedSource.id, started_at: startedAt, queries_run: queries.length }).select("id").maybeSingle();
      runId = run?.id ?? null;
    }
    const candidates: Array<Record<string, unknown>> = [];
    for (const query of queries) {
      const allowedDomains = selectedSource ? [new URL(selectedSource.base_url).hostname] : undefined;
      const result = await searchExternal({ query, topic: "news", freshness: "recent", maxResults: 5, allowedDomains });
      if (result.status !== "ok") continue;
      for (const source of result.sources) {
        const excerpt = source.snippet.trim().slice(0, 4000);
        const title = source.title.trim().slice(0, 300);
        if (!title || !excerpt || !source.url) continue;
        candidates.push({ source_url: source.url, source_title: title, source_excerpt: excerpt, source_organization: new URL(source.url).hostname, source_published_at: source.publishedAt ?? null, incident_type: query.includes("flood") ? "flooding" : query.includes("roadworks") ? "roadworks" : "crash_or_road_incident", location_hint: null, ...(selectedSource ? { source_id: selectedSource.id } : {}), fingerprint: await fingerprint(`${title} ${excerpt}`) });
      }
    }
    if (!candidates.length) {
      if (runId) await supabaseAdmin.from("incident_monitor_runs").update({ completed_at: new Date().toISOString(), status: "succeeded", candidates_created: 0 }).eq("id", runId);
      return { status: "no_candidates", inserted: 0 };
    }
    const { data: inserted, error } = await supabaseAdmin.from("incident_discovery_candidates").upsert(candidates, { onConflict: "source_url", ignoreDuplicates: true }).select("id,source_url,source_title,source_excerpt");
    if (error) throw error;
    const { data: approvedReports } = await supabaseAdmin.from("accident_reports").select("id,title,description,county,road").eq("status", "approved").limit(250);
    for (const candidate of inserted ?? []) {
      const match = (approvedReports ?? []).map((report) => duplicateScore(candidate, report)).filter((value): value is { id: string; score: number; reason: string } => !!value).sort((a, b) => b.score - a.score)[0];
      if (!match) continue;
      await supabaseAdmin.from("incident_discovery_candidates").update({ duplicate_of_report_id: match.id }).eq("id", candidate.id);
      // These explanatory fields are additive and may not exist until the
      // source-operations migration is applied; never make discovery fail for
      // that optional enrichment.
      await supabaseAdmin.from("incident_discovery_candidates").update({ duplicate_confidence: Number(match.score.toFixed(4)), duplicate_reason: match.reason }).eq("id", candidate.id);
    }
    if (runId) {
      await supabaseAdmin.from("incident_monitor_runs").update({ completed_at: new Date().toISOString(), status: "succeeded", candidates_created: inserted?.length ?? 0 }).eq("id", runId);
      await supabaseAdmin.from("incident_monitor_sources").update({ last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null, candidate_count: inserted?.length ?? 0 }).eq("id", selectedSource!.id);
    }
    return { status: "drafts_created", inserted: inserted?.length ?? 0 };
  });
