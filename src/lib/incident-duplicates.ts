import type { SupabaseClient } from "@supabase/supabase-js";

export type IncidentEvidence = {
  type: "discovery_candidate" | "alert" | "report" | "feed_post";
  id?: string;
  title?: string | null;
  body?: string | null;
  county?: string | null;
  road?: string | null;
  incidentType?: string | null;
  occurredAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sourceUrl?: string | null;
};

export type DuplicateMatch = {
  score: number;
  reasons: string[];
};

const tokens = (value: unknown) => new Set(String(value ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((item) => item.length >= 4));

function dateDistanceDays(left?: string | null, right?: string | null) {
  if (!left || !right) return null;
  const a = Date.parse(left);
  const b = Date.parse(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(a - b) / 86_400_000;
}

function coordinateDistanceKm(left: IncidentEvidence, right: IncidentEvidence) {
  if (left.latitude == null || left.longitude == null || right.latitude == null || right.longitude == null) return null;
  const lat = ((right.latitude - left.latitude) * Math.PI) / 180;
  const lng = ((right.longitude - left.longitude) * Math.PI) / 180;
  const haversine = Math.sin(lat / 2) ** 2 + Math.cos((left.latitude * Math.PI) / 180) * Math.cos((right.latitude * Math.PI) / 180) * Math.sin(lng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function scoreIncidentDuplicate(left: IncidentEvidence, right: IncidentEvidence): DuplicateMatch | null {
  const reasons: string[] = [];
  const leftTokens = tokens(`${left.title ?? ""} ${left.body ?? ""}`);
  const rightTokens = tokens(`${right.title ?? ""} ${right.body ?? ""}`);
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const textScore = overlap / Math.max(1, Math.min(leftTokens.size, rightTokens.size));
  if (overlap >= 2) reasons.push(`${overlap} meaningful title/body terms overlap`);

  const leftLocation = [left.county, left.road].filter((item) => item && String(item).trim().length >= 3).map((item) => String(item).toLowerCase());
  const rightLocation = [right.county, right.road].filter((item) => item && String(item).trim().length >= 3).map((item) => String(item).toLowerCase());
  const locationMatches = leftLocation.filter((item) => rightLocation.some((other) => item === other || item.includes(other) || other.includes(item))).length;
  if (locationMatches) reasons.push("county or road matches");

  const days = dateDistanceDays(left.occurredAt, right.occurredAt);
  if (days != null && days <= 2) reasons.push(`incident dates are within ${Math.round(days * 24)} hours`);
  const distance = coordinateDistanceKm(left, right);
  if (distance != null && distance <= 5) reasons.push(`coordinates are within ${distance.toFixed(1)} km`);
  if (left.incidentType && right.incidentType && left.incidentType === right.incidentType) reasons.push("incident type matches");

  // Missing date, location, coordinates and casualty values are neutral—not a match.
  const score = Math.min(0.99, textScore * 0.55 + (locationMatches ? 0.2 : 0) + (days != null && days <= 2 ? 0.15 : 0) + (distance != null && distance <= 5 ? 0.1 : 0) + (left.incidentType && right.incidentType && left.incidentType === right.incidentType ? 0.05 : 0));
  return score >= 0.62 && reasons.length >= 2 ? { score, reasons } : null;
}

function rowToEvidence(type: IncidentEvidence["type"], row: any): IncidentEvidence {
  return {
    type,
    id: row.id,
    title: row.title ?? row.source_title,
    body: row.description ?? row.body ?? row.source_excerpt,
    county: row.county ?? row.location_hint,
    road: row.road,
    incidentType: row.hazard_type ?? row.incident_type,
    occurredAt: row.occurred_at ?? row.event_date ?? row.created_at,
    latitude: row.latitude,
    longitude: row.longitude,
    sourceUrl: row.source_url,
  };
}

export async function suggestIncidentDuplicates(db: SupabaseClient<any>, candidate: IncidentEvidence) {
  if (!candidate.id) return 0;
  const targets: Array<{ type: IncidentEvidence["type"]; rows: any[] }> = [];
  const queries = await Promise.all([
    db.from("alerts").select("id,title,description,county,road,hazard_type,created_at,latitude,longitude").eq("status", "active").limit(250),
    db.from("accident_reports").select("id,title,description,county,road,occurred_at,latitude,longitude,status").eq("status", "approved").limit(250),
    db.from("feed_posts").select("id,body,created_at,status,moderation_status").eq("status", "published").eq("moderation_status", "approved").limit(250),
    db.from("incident_discovery_candidates").select("id,source_title,source_excerpt,location_hint,incident_type,event_date,source_url,status").eq("status", "draft").limit(250),
  ]);
  if (!queries[0].error) targets.push({ type: "alert", rows: queries[0].data ?? [] });
  if (!queries[1].error) targets.push({ type: "report", rows: queries[1].data ?? [] });
  if (!queries[2].error) targets.push({ type: "feed_post", rows: queries[2].data ?? [] });
  if (!queries[3].error) targets.push({ type: "discovery_candidate", rows: queries[3].data ?? [] });
  let created = 0;
  for (const group of targets) {
    for (const row of group.rows) {
      if (group.type === candidate.type && row.id === candidate.id) continue;
      const match = scoreIncidentDuplicate(candidate, rowToEvidence(group.type, row));
      if (!match) continue;
      const { error } = await db.from("incident_duplicate_suggestions").upsert({ candidate_type: candidate.type, candidate_id: candidate.id, target_type: group.type, target_id: row.id, confidence: Number(match.score.toFixed(4)), reasons: match.reasons, status: "suggested" }, { onConflict: "candidate_type,candidate_id,target_type,target_id", ignoreDuplicates: true });
      if (!error) created += 1;
    }
  }
  return created;
}
