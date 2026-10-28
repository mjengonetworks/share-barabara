import { supabase } from "@/integrations/supabase/client";

export type CanonicalTransportRow = {
  incident_id: string;
  transport_mode: string;
  is_primary: boolean;
  country_code: string | null;
  admin_area: string | null;
  locality: string | null;
  transport_corridor: string | null;
  occurred_at: string;
  county: string | null;
  road: string | null;
  road_id: string | null;
  severity: string | null;
  incident_type: string | null;
  vehicles_involved: number | null;
  casualty_breakdown: Record<string, { dead?: number; injured?: number }> | null;
  fatalities: number | null;
  injuries: number | null;
  latitude: number | null;
  longitude: number | null;
  report_id: string | null;
  alert_id: string | null;
};

export type CanonicalStatisticsFilter = {
  from?: string | null;
  to?: string | null;
  countryCode?: string | null;
  transportMode?: string | null;
  adminArea?: string | null;
};

export type StatisticsSource = "canonical" | "reports-fallback";

export type LiveIncidentRow = CanonicalTransportRow & {
  source: StatisticsSource;
  parties_involved: string[];
  casualties: number | null;
};

function isMissingCanonicalRpc(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "");
  return /does not exist|not found|PGRST202|schema cache|canonical_transport_statistics/i.test(message);
}

function partiesFromBreakdown(breakdown: CanonicalTransportRow["casualty_breakdown"]) {
  return Object.keys(breakdown ?? {});
}

function dedupeModes(rows: CanonicalTransportRow[]) {
  const byIncident = new Map<string, CanonicalTransportRow>();
  for (const row of rows) {
    const current = byIncident.get(row.incident_id);
    if (!current || row.is_primary) byIncident.set(row.incident_id, row);
  }
  return [...byIncident.values()];
}

function toLiveRows(rows: CanonicalTransportRow[], source: StatisticsSource): LiveIncidentRow[] {
  return dedupeModes(rows).map((row) => ({
    ...row,
    source,
    parties_involved: partiesFromBreakdown(row.casualty_breakdown),
    casualties: row.injuries,
  }));
}

async function fallbackApprovedReports(filter: CanonicalStatisticsFilter) {
  // Before the canonical migration, the legacy schema can only represent
  // approved road Reports. Never present those rows as rail/aviation/etc. or
  // claim an unknown country is Kenya.
  if (filter.transportMode && filter.transportMode !== "road") return [];
  if (filter.countryCode && filter.countryCode !== "KE") return [];
  let query = supabase
    .from("accident_reports")
    .select("id,occurred_at,county,road,road_id,severity,incident_type,vehicles_involved,casualty_breakdown,fatalities,casualties,latitude,longitude")
    .eq("status", "approved")
    .is("deleted_at", null);
  if (filter.from) query = query.gte("occurred_at", filter.from);
  if (filter.to) query = query.lte("occurred_at", filter.to);
  if (filter.adminArea) query = query.eq("county", filter.adminArea);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    incident_id: row.id,
    transport_mode: "road",
    is_primary: true,
    country_code: null,
    admin_area: row.county,
    locality: null,
    transport_corridor: row.road,
    occurred_at: row.occurred_at,
    county: row.county,
    road: row.road,
    road_id: row.road_id,
    severity: row.severity,
    incident_type: row.incident_type,
    vehicles_involved: row.vehicles_involved,
    casualty_breakdown: row.casualty_breakdown,
    fatalities: row.fatalities,
    injuries: row.casualties,
    latitude: row.latitude,
    longitude: row.longitude,
    report_id: row.id,
    alert_id: null,
  } satisfies CanonicalTransportRow));
}

/**
 * Reads the canonical transport model when its migration is active, while
 * preserving the current approved-Report behavior before that migration is
 * applied. The fallback is deliberately Report-only and never reads Alert
 * casualty data, preventing an unsafe double count.
 */
export async function loadLiveCanonicalIncidents(filter: CanonicalStatisticsFilter = {}) {
  const { data, error } = await (supabase.rpc as any)("public_canonical_transport_statistics", {
    _from: filter.from ?? null,
    _to: filter.to ?? null,
    _country_code: filter.countryCode ?? null,
    _transport_mode: filter.transportMode ?? null,
    _admin_area: filter.adminArea ?? null,
  });
  if (!error && Array.isArray(data)) return toLiveRows(data as CanonicalTransportRow[], "canonical");
  if (error && !isMissingCanonicalRpc(error)) throw error;
  const fallback = await fallbackApprovedReports(filter);
  return toLiveRows(fallback, "reports-fallback");
}

export async function loadCanonicalMapRows(filter: Pick<CanonicalStatisticsFilter, "countryCode" | "transportMode"> = {}) {
  const { data, error } = await (supabase.rpc as any)("public_canonical_transport_map", {
    _transport_mode: filter.transportMode ?? null,
    _country_code: filter.countryCode ?? null,
  });
  if (!error && Array.isArray(data)) return data as Array<Pick<CanonicalTransportRow, "incident_id" | "transport_mode" | "country_code" | "admin_area" | "transport_corridor" | "occurred_at" | "severity" | "latitude" | "longitude" | "report_id" | "alert_id">>;
  if (error && !isMissingCanonicalRpc(error)) throw error;
  const fallback = await fallbackApprovedReports(filter);
  return fallback.filter((row) => row.latitude !== null && row.longitude !== null).map((row) => ({
    incident_id: row.incident_id,
    transport_mode: row.transport_mode,
    country_code: row.country_code,
    admin_area: row.admin_area,
    transport_corridor: row.transport_corridor,
    occurred_at: row.occurred_at,
    severity: row.severity,
    latitude: row.latitude,
    longitude: row.longitude,
    report_id: row.report_id,
    alert_id: row.alert_id,
  }));
}
