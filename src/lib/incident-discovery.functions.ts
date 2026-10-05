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

export const discoverRoadSafetyCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data?: { queries?: string[] }; context: { supabase: any; userId: string } }) => {
    const { data: roles, error: rolesError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (rolesError) throw rolesError;
    if (!(roles ?? []).some((item: { role: string }) => item.role === "editor" || item.role === "admin")) throw new Error("Incident discovery requires an editor role.");
    const { searchExternal } = await import("@/lib/ai/external.server");
    const queries = (Array.isArray(data?.queries) ? data!.queries : DEFAULT_QUERIES).map((query) => String(query).trim().slice(0, 180)).filter(Boolean).slice(0, 5);
    const candidates: Array<Record<string, unknown>> = [];
    for (const query of queries) {
      const result = await searchExternal({ query, topic: "news", freshness: "recent", maxResults: 5 });
      if (result.status !== "ok") continue;
      for (const source of result.sources) {
        const excerpt = source.snippet.trim().slice(0, 4000);
        const title = source.title.trim().slice(0, 300);
        if (!title || !excerpt || !source.url) continue;
        candidates.push({ source_url: source.url, source_title: title, source_excerpt: excerpt, source_organization: new URL(source.url).hostname, source_published_at: source.publishedAt ?? null, incident_type: query.includes("flood") ? "flooding" : query.includes("roadworks") ? "roadworks" : "crash_or_road_incident", location_hint: null, fingerprint: await fingerprint(`${title} ${excerpt}`) });
      }
    }
    if (!candidates.length) return { status: "no_candidates", inserted: 0 };
    const { data: inserted, error } = await (await import("@/integrations/supabase/client.server")).supabaseAdmin.from("incident_discovery_candidates").upsert(candidates, { onConflict: "source_url", ignoreDuplicates: true }).select("id");
    if (error) throw error;
    return { status: "drafts_created", inserted: inserted?.length ?? 0 };
  });
