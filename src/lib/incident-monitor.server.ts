import { searchExternal } from "@/lib/ai/external.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { suggestIncidentDuplicates } from "@/lib/incident-duplicates";

type Source = { id: string; name: string; base_url: string; source_class?: string; keywords: string[]; check_interval_minutes?: number };

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

export async function executeIncidentMonitorRun(source: Source, runId: string, queries = source.keywords?.length ? source.keywords : DEFAULT_QUERIES) {
  const boundedQueries = queries.map((query) => String(query).trim().slice(0, 180)).filter(Boolean).slice(0, 5);
  const retryAt = () => new Date(Date.now() + Math.min(1440, Math.max(5, Number(source.check_interval_minutes ?? 60) * 2 ** Math.min(Number(source.consecutive_failures ?? 0) + 1, 4))) * 60_000).toISOString();
  let insertedCount = 0;
  try {
    const allowedDomains = [new URL(source.base_url).hostname];
    const candidates: Array<Record<string, unknown>> = [];
    for (const query of boundedQueries) {
      const result = await searchExternal({ query, topic: "news", freshness: "recent", maxResults: 5, allowedDomains });
      if (result.status !== "ok") {
        await supabaseAdmin.from("incident_monitor_runs").update({ status: result.status === "external_search_unavailable" ? "unavailable" : "failed", completed_at: new Date().toISOString(), queries_run: boundedQueries.length, error_message: `Retrieval ${result.status.replaceAll("_", " ")}.` }).eq("id", runId);
        await supabaseAdmin.from("incident_monitor_sources").update({ next_check_at: retryAt(), last_checked_at: new Date().toISOString(), last_failure_at: new Date().toISOString(), last_error: `Retrieval ${result.status.replaceAll("_", " ")}.`, consecutive_failures: Number(source.consecutive_failures ?? 0) + 1, last_run_status: result.status === "external_search_unavailable" ? "unavailable" : "failed" }).eq("id", source.id);
        return { status: result.status, inserted: 0 };
      }
      for (const item of result.sources) {
        const title = item.title.trim().slice(0, 300);
        const excerpt = item.snippet.trim().slice(0, 4000);
        if (!title || !excerpt || !item.url) continue;
        candidates.push({ source_url: item.url, source_title: title, source_excerpt: excerpt, source_organization: new URL(item.url).hostname, source_published_at: item.publishedAt ?? null, incident_type: query.toLowerCase().includes("flood") ? "flooding" : query.toLowerCase().includes("roadworks") ? "roadworks" : "crash_or_road_incident", location_hint: null, source_id: source.id, fingerprint: await fingerprint(`${title} ${excerpt}`) });
      }
    }
    if (candidates.length) {
      const { data, error } = await supabaseAdmin.from("incident_discovery_candidates").upsert(candidates, { onConflict: "source_url", ignoreDuplicates: true }).select("id,source_url,source_title,source_excerpt");
      if (error) throw error;
      insertedCount = data?.length ?? 0;
      for (const candidate of data ?? []) await suggestIncidentDuplicates(supabaseAdmin, { type: "discovery_candidate", id: candidate.id, title: candidate.source_title, body: candidate.source_excerpt, sourceUrl: candidate.source_url });
    }
    await supabaseAdmin.from("incident_monitor_runs").update({ status: "succeeded", completed_at: new Date().toISOString(), queries_run: boundedQueries.length, candidates_created: insertedCount, error_message: null }).eq("id", runId);
    await supabaseAdmin.from("incident_monitor_sources").update({ last_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null, consecutive_failures: 0, candidate_count: insertedCount, last_run_status: "succeeded" }).eq("id", source.id);
    return { status: candidates.length ? "drafts_created" : "no_candidates", inserted: insertedCount };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Source run failed.";
    await supabaseAdmin.from("incident_monitor_runs").update({ status: "failed", completed_at: new Date().toISOString(), queries_run: boundedQueries.length, error_message: message }).eq("id", runId);
    await supabaseAdmin.from("incident_monitor_sources").update({ next_check_at: retryAt(), last_checked_at: new Date().toISOString(), last_failure_at: new Date().toISOString(), last_error: message, consecutive_failures: Number(source.consecutive_failures ?? 0) + 1, last_run_status: "failed" }).eq("id", source.id);
    throw error;
  }
}

export async function runDueIncidentMonitorSources(limit = 3) {
  const { data, error } = await supabaseAdmin.rpc("claim_due_incident_monitor_sources", { p_limit: Math.min(Math.max(limit, 1), 10) });
  if (error) {
    if (/function .*claim_due_incident_monitor_sources|does not exist|incident_monitor_sources/i.test(error.message ?? "")) return { status: "scheduler_unavailable", processed: 0 };
    throw error;
  }
  let processed = 0;
  for (const source of (data ?? []) as Array<Source & { run_id: string; source_id: string }>) {
    try { await executeIncidentMonitorRun({ ...source, id: source.source_id }, source.run_id); processed += 1; } catch { /* one source must not stop the bounded batch */ }
  }
  return { status: "ok", processed };
}
