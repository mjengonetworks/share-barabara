import { createPublicSupabaseClient } from "@/integrations/supabase/public.server";
import { MAX_EVIDENCE_CHARS, MAX_EVIDENCE_RECORDS, clampText } from "./safe";
import type { Evidence, PublicContextType } from "./types";

const CURRENT_SIGNAL = /\b(current|currently|latest|today|tonight|now|breaking|recent|this week|this month|online|web|internet|as of)\b/i;

/** Conservative, deterministic gate. A small local result set can still be sufficient. */
export function assessLocalEvidence(query: string, evidence: Evidence[], contextType: PublicContextType) {
  if (!evidence.length) return { sufficient: false, reason: "no_local_evidence" as const };
  if (CURRENT_SIGNAL.test(query)) return { sufficient: false, reason: "freshness_requested" as const };
  if (contextType !== "general" && evidence.length > 0) return { sufficient: true, reason: "direct_context" as const };
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 3))].slice(0, 8);
  const relevant = evidence.filter((item) => {
    const haystack = `${item.title} ${item.text}`.toLowerCase();
    return terms.length === 0 || terms.some((term) => haystack.includes(term));
  });
  return relevant.length > 0 ? { sufficient: true, reason: "relevant_local_evidence" as const } : { sufficient: false, reason: "local_evidence_not_direct" as const };
}

function finish(items: Evidence[]) {
  let chars = 0;
  return items.slice(0, MAX_EVIDENCE_RECORDS).filter((item) => {
    if (chars + item.text.length > MAX_EVIDENCE_CHARS) return false;
    chars += item.text.length;
    return true;
  });
}

export async function resolvePublicEvidence(type: PublicContextType, id?: string, query?: string) {
  const db = createPublicSupabaseClient();
  const evidence: Evidence[] = [];
  if (type === "article" && id) {
    const { data } = await db
      .from("news")
      .select("id,slug,title,summary,body,category,source,published_at")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (data)
      evidence.push({
        id: data.id,
        kind: "article",
        title: data.title,
        href: `/news/${data.slug}`,
        text: clampText(
          `${data.summary}\n${data.body}\nCategory: ${data.category}\nSource: ${data.source ?? ""}`,
          5000,
        ),
      });
  }
  if (type === "alert" && id) {
    const { data } = await db
      .from("alerts")
      .select("id,title,description,county,road,hazard_type,severity,status,created_at,updated_at")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();
    if (data)
      evidence.push({
        id: data.id,
        kind: "alert",
        title: data.title,
        href: `/alerts/${data.id}`,
        text: clampText(
          `${data.description}\nCounty: ${data.county}\nRoad: ${data.road ?? ""}\nHazard: ${data.hazard_type}\nSeverity: ${data.severity}\nStatus: ${data.status}\nReported: ${data.created_at}\nUpdated: ${data.updated_at}`,
          5000,
        ),
      });
  }
  if (type === "report" && id) {
    const { data } = await db
      .from("accident_reports")
      .select(
        "id,title,description,county,road,occurred_at,vehicles_involved,casualties,fatalities,severity,status",
      )
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();
    if (data)
      evidence.push({
        id: data.id,
        kind: "report",
        title: data.title,
        href: `/reports/${data.id}`,
        text: clampText(
          `${data.description}\nCounty: ${data.county}\nRoad: ${data.road ?? ""}\nOccurred: ${data.occurred_at}\nVehicles: ${data.vehicles_involved ?? "Not confirmed"}\nCasualties: ${data.casualties ?? "Not confirmed"}\nFatalities: ${data.fatalities ?? "Not confirmed"}\nSeverity: ${data.severity}`,
          5000,
        ),
      });
  }
  if (type === "general" && query) {
    const stopWords = new Set([
      "about", "alert", "alerts", "available", "can", "for", "from", "has",
      "latest", "me", "of", "on", "please", "tell", "the", "what", "which",
    ]);
    const terms = [...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 3 && !stopWords.has(term)),
    )].slice(0, 5);
    const matches = await Promise.all(
      terms.map(async (term) => {
        const escaped = term.replace(/[%_]/g, "\\$&").slice(0, 40);
        const pattern = `%${escaped}%`;
        const [articles, alerts, reports, updates, community] = await Promise.all([
          db.from("news").select("id,slug,title,summary,category").eq("status", "published").or(`title.ilike.${pattern},summary.ilike.${pattern}`).limit(4),
          db.from("alerts").select("id,title,description,county,road,status").eq("status", "active").or(`title.ilike.${pattern},description.ilike.${pattern},county.ilike.${pattern},road.ilike.${pattern}`).limit(4),
          db.from("accident_reports").select("id,title,description,county,road,occurred_at,status").eq("status", "approved").or(`title.ilike.${pattern},description.ilike.${pattern},county.ilike.${pattern},road.ilike.${pattern}`).limit(4),
          db.from("editorial_updates").select("id,parent_type,parent_id,title,body,published_at").eq("status", "published").or(`title.ilike.${pattern},body.ilike.${pattern}`).limit(4),
          db.from("feed_posts").select("id,body,created_at").eq("status", "published").eq("moderation_status", "approved").ilike("body", pattern).limit(4),
        ]);
        return { articles: articles.data ?? [], alerts: alerts.data ?? [], reports: reports.data ?? [], updates: updates.data ?? [], community: community.data ?? [] };
      }),
    );
    const seen = new Set<string>();
    for (const row of matches.flatMap((match) => match.articles))
      if (!seen.has(`article:${row.id}`)) {
        seen.add(`article:${row.id}`);
        evidence.push({ id: row.id, kind: "article", title: row.title, href: `/news/${row.slug}`, text: clampText(`${row.summary}\nCategory: ${row.category}`, 2200) });
      }
    for (const row of matches.flatMap((match) => match.alerts))
      if (!seen.has(`alert:${row.id}`)) {
        seen.add(`alert:${row.id}`);
        evidence.push({ id: row.id, kind: "alert", title: row.title, href: `/alerts/${row.id}`, text: clampText(`${row.description}\nCounty: ${row.county}\nRoad: ${row.road ?? ""}\nStatus: ${row.status}`, 2200) });
      }
    for (const row of matches.flatMap((match) => match.reports))
      if (!seen.has(`report:${row.id}`)) {
        seen.add(`report:${row.id}`);
        evidence.push({ id: row.id, kind: "report", title: row.title, href: `/reports/${row.id}`, text: clampText(`${row.description}\nCounty: ${row.county}\nRoad: ${row.road ?? ""}\nOccurred: ${row.occurred_at}`, 2200) });
      }
    for (const row of matches.flatMap((match) => match.updates))
      if (!seen.has(`update:${row.id}`)) {
        seen.add(`update:${row.id}`);
        evidence.push({ id: row.id, kind: "update", title: row.title ?? "Editorial update", href: row.parent_type === "alert" ? `/alerts/${row.parent_id}` : `/reports/${row.parent_id}`, publishedAt: row.published_at, text: clampText(`Published Editorial Update for ${row.parent_type} ${row.parent_id}:\n${row.body}`, 2600) });
      }
    for (const row of matches.flatMap((match) => match.community))
      if (!seen.has(`community:${row.id}`)) {
        seen.add(`community:${row.id}`);
        evidence.push({ id: row.id, kind: "community", title: "Share Barabara community discussion", href: "/feed", sourceClass: "social_or_user_generated", verificationState: "unverified", text: clampText(`Community post (unverified user-generated evidence):\n${row.body}\nPosted: ${row.created_at}`, 2200) });
      }
  }
  return finish(evidence);
}
