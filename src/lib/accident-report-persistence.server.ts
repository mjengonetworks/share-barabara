import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { CasualtyBreakdown } from "@/components/site/party-casualty-inputs";
import { serverEnv } from "@/lib/runtime-env.server";
import { suggestIncidentDuplicates } from "@/lib/incident-duplicates";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 128 * 1024;
const roleRank: Record<string, number> = { member: 0, guest_author: 1, author: 2, moderator: 3, editor: 4, admin: 5 };

export type ReportMutation = {
  requestId?: string;
  id?: string;
  requestedStatus?: "pending" | "approved";
  title: string;
  summary?: string | null;
  description: string;
  county: string;
  road: string;
  incident_type?: string | null;
  severity: string;
  occurred_at: string;
  vehicles_involved: number | null;
  casualties: number | null;
  fatalities: number | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  image_alt: string | null;
  image_caption: string | null;
  image_credit: string | null;
  road_id: string | null;
  parties_involved: string[];
  casualty_breakdown: CasualtyBreakdown;
  attachments: unknown[];
  page_id: string | null;
  is_anonymous: boolean;
};

type Failure = {
  requestId: string;
  phase: string;
  code: string;
  status: number;
  message: string;
  outcome: "failure" | "uncertain";
};

type Result =
  | { ok: true; outcome: "confirmed"; requestId: string; operation: "create" | "update"; contentType: "report"; data: { id: string; status: string } }
  | { ok: false; outcome: "failure" | "uncertain"; requestId: string; operation: "create" | "update"; contentType: "report"; error: Failure };

function requestId(value: unknown): string {
  return typeof value === "string" && UUID.test(value) ? value : crypto.randomUUID();
}

function safeCode(error: unknown, fallback = "UNEXPECTED_SERVER_FAILURE") {
  const value = (error as { code?: unknown } | null)?.code;
  return typeof value === "string" && /^[A-Z0-9_.-]{1,48}$/.test(value) ? value : fallback;
}

function safeStatus(error: unknown, fallback = 500) {
  const value = (error as { status?: unknown; statusCode?: unknown } | null)?.status ?? (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof value === "number" && value >= 400 && value <= 599 ? value : fallback;
}

function publicMessage(code: string) {
  if (code === "AUTHENTICATION_FAILED") return "The current session is not authorized to save this report.";
  if (code === "AUTHORIZATION_FAILED" || code === "42501" || code === "PGRST301") return "The current session is not authorized to save this report.";
  if (/^(23502|23503|22P02|PGRST204|PGRST205)$/.test(code)) return "The database rejected one or more report fields.";
  if (code === "23505") return "A conflicting report already exists.";
  if (code === "PERSISTENCE_UNCERTAIN") return "The write outcome could not be confirmed.";
  if (code === "VALIDATION_FAILED" || code.endsWith("_REQUIRED") || code === "REPORT_FIELDS_INVALID") return "The report fields are invalid.";
  return code === "UNEXPECTED_SERVER_FAILURE" ? "The report save could not be completed by the server." : "The database rejected the report.";
}

function failure(id: string, operation: "create" | "update", phase: string, error: unknown, fallbackCode = "UNEXPECTED_SERVER_FAILURE", fallbackStatus = 500, outcome: "failure" | "uncertain" = "failure"): Result {
  const code = safeCode(error, fallbackCode);
  const status = safeStatus(error, fallbackStatus);
  const diagnostic: Failure = { requestId: id, phase, code, status, message: publicMessage(code), outcome };
  console.error("[CMS persistence]", { requestId: id, operation, contentType: "report", phase, code, status, outcome });
  return { ok: false, outcome, requestId: id, operation, contentType: "report", error: diagnostic };
}

function response(result: Result) {
  return Response.json(result, {
    status: result.ok ? (result.operation === "create" ? 201 : 200) : result.error.status,
    headers: { "cache-control": "no-store", "x-request-id": result.requestId },
  });
}

function supabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if ((key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function clientFor(request: Request) {
  const url = serverEnv("SUPABASE_URL") ?? import.meta.env["VITE_SUPABASE_URL"];
  const key = serverEnv("SUPABASE_PUBLISHABLE_KEY") ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !bearer || bearer.split(".").length !== 3) return null;
  return { token: bearer, supabase: createClient<Database>(url, key, { global: { fetch: supabaseFetch(key), headers: { Authorization: `Bearer ${bearer}` } }, auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }) };
}

function validate(value: unknown, id: string, operation: "create" | "update"): Failure | null {
  const data = value as Partial<ReportMutation> | null;
  if (!data || typeof data !== "object") return { requestId: id, phase: "validation", code: "VALIDATION_FAILED", status: 400, message: publicMessage("VALIDATION_FAILED"), outcome: "failure" };
  if (!data.title?.trim()) return { requestId: id, phase: "validation", code: "TITLE_REQUIRED", status: 400, message: "The report title is required.", outcome: "failure" };
  if (!data.description?.trim()) return { requestId: id, phase: "validation", code: "DESCRIPTION_REQUIRED", status: 400, message: "The incident description is required.", outcome: "failure" };
  if (!data.county?.trim()) return { requestId: id, phase: "validation", code: "COUNTY_REQUIRED", status: 400, message: "The report county is required.", outcome: "failure" };
  if (!data.severity?.trim() || !data.occurred_at) return { requestId: id, phase: "validation", code: "REPORT_FIELDS_INVALID", status: 400, message: publicMessage("REPORT_FIELDS_INVALID"), outcome: "failure" };
  if (operation === "update" && (!data.id || !UUID.test(data.id))) return { requestId: id, phase: "validation", code: "REPORT_ID_INVALID", status: 400, message: publicMessage("VALIDATION_FAILED"), outcome: "failure" };
  return null;
}

async function hasColumn(supabase: SupabaseClient<Database>, column: "summary" | "incident_type") {
  const { error } = await (supabase.from("accident_reports") as any).select(column).limit(1);
  return !error;
}

function payload(data: ReportMutation, userId: string, status: "pending" | "approved" | undefined, columns: { summary: boolean; incident_type: boolean }) {
  const value: Record<string, unknown> = {
    title: data.title.trim(), description: data.description.trim(), county: data.county.trim(), road: data.road?.trim() || null,
    occurred_at: data.occurred_at, vehicles_involved: data.vehicles_involved, casualties: data.casualties, fatalities: data.fatalities,
    severity: data.severity, latitude: data.latitude, longitude: data.longitude, image_url: data.image_url, image_alt: data.image_alt,
    image_caption: data.image_caption, image_credit: data.image_credit, road_id: data.road_id, page_id: data.page_id,
    parties_involved: data.parties_involved, casualty_breakdown: data.casualty_breakdown, attachments: data.attachments,
    is_anonymous: data.is_anonymous, user_id: userId,
  };
  if (status) value.status = status;
  if (columns.summary && data.summary !== undefined) value.summary = data.summary;
  if (columns.incident_type && data.incident_type !== undefined) value.incident_type = data.incident_type;
  return value;
}

async function roles(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw Object.assign(error, { phase: "role_lookup" });
  return (data ?? []).some((row) => (roleRank[row.role] ?? 0) >= roleRank.moderator);
}

async function readExisting(supabase: SupabaseClient<Database>, id: string, userId: string) {
  const { data, error } = await (supabase.from("accident_reports") as any).select("id,user_id,status,title,description,county,occurred_at").eq("id", id).maybeSingle();
  if (error) throw Object.assign(error, { code: "PERSISTENCE_UNCERTAIN", status: 503, phase: "readback_verification" });
  if (!data?.id || data.user_id !== userId) throw Object.assign(new Error("The current session cannot edit this report"), { code: "AUTHORIZATION_FAILED", status: 403, phase: "authorization" });
  return data as { id: string; status: string; title: string; description: string; county: string; occurred_at: string };
}

async function mutate(request: Request, operation: "create" | "update", pathId?: string): Promise<Response> {
  const id = requestId(request.headers.get("x-request-id"));
  const bodySize = Number(request.headers.get("content-length") ?? 0);
  if (bodySize > MAX_BODY_BYTES) return response(failure(id, operation, "request_body", new Error(), "REQUEST_TOO_LARGE", 413));
  let data: ReportMutation;
  try { data = await request.json() as ReportMutation; } catch { return response(failure(id, operation, "request_body", new Error(), "INVALID_JSON", 400)); }
  if (operation === "update") data.id = pathId;
  const invalid = validate(data, id, operation);
  if (invalid) return response({ ok: false, outcome: "failure", requestId: id, operation, contentType: "report", error: invalid });
  const auth = clientFor(request);
  if (!auth) return response(failure(id, operation, "authentication", new Error(), "AUTHENTICATION_FAILED", 401));
  const { supabase, token } = auth;
  try {
    const claims = await supabase.auth.getClaims(token);
    const userId = claims.data?.claims?.sub;
    if (claims.error || typeof userId !== "string") return response(failure(id, operation, "authentication", claims.error, "AUTHENTICATION_FAILED", 401));
    const canPublish = await roles(supabase, userId);
    const status = data.requestedStatus === "approved" && canPublish ? "approved" : data.requestedStatus ? "pending" : undefined;
    const columns = await Promise.all([hasColumn(supabase, "summary"), hasColumn(supabase, "incident_type")]);
    const write = payload(data, userId, status, { summary: columns[0], incident_type: columns[1] });
    const reportId = operation === "create" ? id : pathId!;
    if (operation === "update") {
      // A pre-read proves ownership before the update. The mutation itself is
      // acknowledged by PostgREST; requiring a second SELECT here would turn a
      // committed update into a false failure when a policy permits UPDATE but
      // restricts SELECT.
      const existing = await readExisting(supabase, reportId, userId);
      const update = { ...write }; delete update.user_id;
      const { error } = await (supabase.from("accident_reports") as any).update(update).eq("id", reportId).eq("user_id", userId);
      if (error) return response(failure(id, operation, "update_record", error));
      const confirmed = { id: existing.id, status: String(status ?? existing.status ?? "pending") };
      try { await suggestIncidentDuplicates(supabase, { type: "report", id: confirmed.id, title: data.title, body: data.description, county: data.county, road: data.road, occurredAt: data.occurred_at, latitude: data.latitude, longitude: data.longitude }); } catch { /* additive review must never change the save result */ }
      return response({ ok: true, outcome: "confirmed", requestId: id, operation, contentType: "report", data: confirmed });
    } else {
      const { error } = await (supabase.from("accident_reports") as any).insert({ id: reportId, ...write });
      if (error && safeCode(error) !== "23505") return response(failure(id, operation, "insert_record", error));
      if (error && safeCode(error) === "23505") {
        let existing: Awaited<ReturnType<typeof readExisting>>;
        try { existing = await readExisting(supabase, reportId, userId); } catch (readError) { return response(failure(id, operation, "idempotency_check", readError, "PERSISTENCE_UNCERTAIN", 503, "uncertain")); }
        if (existing.title !== write.title || existing.description !== write.description) return response(failure(id, operation, "idempotency_check", new Error(), "DUPLICATE_REQUEST_CONFLICT", 409));
        return response({ ok: true, outcome: "confirmed", requestId: id, operation, contentType: "report", data: { id: existing.id, status: String(existing.status ?? "pending") } });
      }
    }
    // The successful PostgREST insert is the durable acknowledgement. The
    // request UUID is the database primary key, so the caller receives the
    // actual persisted ID without a RLS-sensitive RETURNING/SELECT round trip.
    try { await suggestIncidentDuplicates(supabase, { type: "report", id: reportId, title: data.title, body: data.description, county: data.county, road: data.road, occurredAt: data.occurred_at, latitude: data.latitude, longitude: data.longitude }); } catch { /* additive review must never change the save result */ }
    return response({ ok: true, outcome: "confirmed", requestId: id, operation, contentType: "report", data: { id: reportId, status: String(status ?? "pending") } });
  } catch (error) {
    const phase = typeof (error as { phase?: unknown })?.phase === "string" ? (error as { phase: string }).phase : "server_function";
    return response(failure(id, operation, phase, error));
  }
}

export async function handleAccidentReportApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/admin\/accident-reports(?:\/([^/]+))?$/);
  if (!match) return new Response("Not found", { status: 404 });
  if (request.method !== "POST" && request.method !== "PUT") return new Response("Method not allowed", { status: 405, headers: { Allow: "POST, PUT" } });
  const pathId = match[1];
  if (request.method === "POST" && pathId) return new Response("Not found", { status: 404 });
  if (request.method === "PUT" && (!pathId || !UUID.test(pathId))) return new Response("Bad request", { status: 400 });
  return mutate(request, request.method === "POST" ? "create" : "update", pathId);
}
