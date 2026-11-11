import { createServerFn } from "@tanstack/react-start";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CasualtyBreakdown } from "@/components/site/party-casualty-inputs";
import { suggestIncidentDuplicates } from "@/lib/incident-duplicates";
import { resolveReportAuth } from "@/integrations/supabase/report-auth.server";

type ReportSubmission = {
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

const REPORT_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function diagnosticRequestId(value?: string) {
  return value && REPORT_REQUEST_ID.test(value) ? value : crypto.randomUUID();
}

function persistenceDiagnostic(error: unknown, requestId: string, phase: string) {
  const candidate = error as { code?: unknown; status?: unknown; statusCode?: unknown; message?: unknown } | null;
  const hasDatabaseCode = typeof candidate?.code === "string" && candidate.code.length <= 32;
  const code = hasDatabaseCode ? candidate.code : "UNEXPECTED_SERVER_FAILURE";
  const statusValue = candidate?.status ?? candidate?.statusCode;
  const status = typeof statusValue === "number" ? statusValue : 500;
  const message = /PERSISTENCE_UNVERIFIED/i.test(String(candidate?.code))
    ? "The database did not confirm the saved report."
    : /42501|PGRST301/i.test(String(code))
    ? "The current session is not authorized to save this report."
    : /23502|23503|22P02|PGRST204|PGRST205/i.test(String(code))
      ? "The database rejected one or more report fields."
      : /23505/i.test(String(code))
        ? "A conflicting report already exists."
        : hasDatabaseCode ? "The database rejected the report." : "The report save could not be completed by the server.";
  return { requestId, phase, code, status, message };
}

type PersistenceFailure = {
  ok: false;
  error: ReturnType<typeof persistenceDiagnostic>;
};

function expectedFailure(
  requestId: string,
  phase: string,
  code: string,
  status: number,
  message: string,
): PersistenceFailure {
  return { ok: false, error: { requestId, phase, code, status, message } };
}

function validateReportSubmission(data: ReportSubmission, requestId: string): PersistenceFailure | null {
  if (!data || typeof data !== "object") return expectedFailure(requestId, "validation", "VALIDATION_FAILED", 400, "The report fields are invalid.");
  if (!data.title?.trim()) return expectedFailure(requestId, "validation", "TITLE_REQUIRED", 400, "The report title is required.");
  if (!data.description?.trim()) return expectedFailure(requestId, "validation", "DESCRIPTION_REQUIRED", 400, "The incident description is required.");
  if (!data.county?.trim()) return expectedFailure(requestId, "validation", "COUNTY_REQUIRED", 400, "The report county is required.");
  if (!data.severity?.trim() || !data.occurred_at) return expectedFailure(requestId, "validation", "REPORT_FIELDS_INVALID", 400, "The report fields are invalid.");
  return null;
}

async function verifyPersistedReport(id: string, userId: string, expected?: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin.from("accident_reports") as any)
    .select("id,user_id,status,title,description,county,occurred_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw Object.assign(new Error("Persistence verification failed"), { code: "PERSISTENCE_UNVERIFIED", status: 503 });
  if (data.user_id !== userId) throw Object.assign(new Error("Report ownership could not be verified"), { code: "42501", status: 403 });
  for (const [key, value] of Object.entries(expected ?? {})) {
    if (String(data[key] ?? "") !== String(value ?? "")) {
      throw Object.assign(new Error("Persistence verification failed"), { code: "PERSISTENCE_UNVERIFIED", status: 503 });
    }
  }
  return data as { id: string; status: string };
}

function recordPersistenceDiagnostic(
  error: unknown,
  requestId: string,
  phase: string,
  operation: "create" | "update",
): PersistenceFailure {
  const diagnostic = persistenceDiagnostic(error, requestId, phase);
  console.error("[CMS persistence failed]", {
    operation,
    contentType: "report",
    requestId: diagnostic.requestId,
    phase: diagnostic.phase,
    code: diagnostic.code,
    status: diagnostic.status,
    message: diagnostic.message,
  });
  return { ok: false, error: diagnostic };
}

type PersistedReportFields = Omit<
  ReportSubmission,
  "requestId" | "requestedStatus" | "road" | "parties_involved" | "casualty_breakdown" | "attachments"
> & {
  road: string | null;
  user_id: string;
};

/**
 * Keep the database boundary explicit.  The form also carries editor-only
 * values, so spreading the complete form object can make a valid report fail
 * when a deployment is one migration behind.
 */
export function buildAccidentReportPayload(
  submission: ReportSubmission,
  userId: string,
  status: "pending" | "approved" | undefined,
  capabilities: { summary: boolean; incident_type: boolean } = {
    summary: true,
    incident_type: true,
  },
) {
  const fields: PersistedReportFields & Record<string, unknown> = {
    title: submission.title.trim(),
    description: submission.description.trim(),
    county: submission.county.trim(),
    road: submission.road?.trim() || null,
    occurred_at: submission.occurred_at,
    vehicles_involved: submission.vehicles_involved,
    casualties: submission.casualties,
    fatalities: submission.fatalities,
    severity: submission.severity,
    latitude: submission.latitude,
    longitude: submission.longitude,
    image_url: submission.image_url,
    image_alt: submission.image_alt,
    image_caption: submission.image_caption,
    image_credit: submission.image_credit,
    road_id: submission.road_id,
    page_id: submission.page_id,
    parties_involved: submission.parties_involved,
    casualty_breakdown: submission.casualty_breakdown,
    attachments: submission.attachments,
    is_anonymous: submission.is_anonymous,
    user_id: userId,
  };
  if (status) fields.status = status;
  if (capabilities.summary && submission.summary !== undefined) fields.summary = submission.summary;
  if (capabilities.incident_type && submission.incident_type !== undefined)
    fields.incident_type = submission.incident_type;
  return fields;
}

async function supportsColumn(
  supabase: SupabaseClient<Database>,
  column: "summary" | "incident_type",
) {
  // The generated client types intentionally lag the reviewed optional columns.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("accident_reports") as any).select(column).limit(1);
  return !error;
}

const roleRank: Record<string, number> = {
  member: 0,
  guest_author: 1,
  author: 2,
  moderator: 3,
  editor: 4,
  admin: 5,
};

export const submitAccidentReport = createServerFn({ method: "POST" }).handler(
    async ({
      data,
    }: {
      data: ReportSubmission;
    }) => {
      const requestId = diagnosticRequestId(data?.requestId);
      const validationFailure = validateReportSubmission(data, requestId);
      if (validationFailure) return validationFailure;
      const recordId = data.id && REPORT_REQUEST_ID.test(data.id) ? data.id : undefined;
      const auth = await resolveReportAuth(requestId, recordId ? "update" : "create");
      if (!auth.ok) return auth;
      const { supabase, userId } = auth.context;
      const { requestedStatus } = data;
      let phase = "role_lookup";
      try {
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        if (rolesError) throw rolesError;

        const canPublish = (roles ?? []).some(
          (entry) => (roleRank[entry.role] ?? 0) >= roleRank.moderator,
        );
        const status = requestedStatus === undefined
          ? undefined
          : canPublish && requestedStatus === "approved" ? "approved" : "pending";
        phase = "schema_capability_probe";
        const [summary, incident_type] = await Promise.all([
          supportsColumn(supabase, "summary"),
          supportsColumn(supabase, "incident_type"),
        ]);
        // The allowlisted builder writes user_id: userId and never trusts
        // a browser-supplied owner value.
        const payload = buildAccidentReportPayload(data, userId, status, {
          summary,
          incident_type,
        });

        phase = recordId ? "update_existing_record" : "insert_record";
        // The generated types still reflect the pre-nullability schema. Keep the
        // compatibility cast at this boundary until Supabase types are regenerated.
        if (recordId) {
          const updatePayload = { ...payload };
          delete updatePayload.user_id;
          const { error } = await supabase
            .from("accident_reports")
            .update(updatePayload as never)
            .eq("id", recordId);
          if (error) throw error;
          const confirmed = await verifyPersistedReport(recordId, userId, {
            title: updatePayload.title,
            description: updatePayload.description,
            county: updatePayload.county,
            occurred_at: updatePayload.occurred_at,
          });
          return { ok: true as const, data: { id: confirmed.id, status: confirmed.status }, requestId };
        }

        // Use the request UUID as the primary key. This makes a retry of the
        // same mutation idempotent and avoids INSERT ... RETURNING being
        // rejected by a SELECT policy after the row has already committed.
        const { error } = await supabase
          .from("accident_reports")
          .insert({ id: requestId, ...payload } as never);
        if (error) {
          if (typeof (error as { code?: unknown }).code === "string" && (error as { code: string }).code === "23505") {
            const confirmed = await verifyPersistedReport(requestId, userId, {
              title: payload.title,
              description: payload.description,
              county: payload.county,
              occurred_at: payload.occurred_at,
            });
            if (confirmed.id === requestId) return { ok: true as const, data: { id: confirmed.id, status: confirmed.status }, requestId };
          }
          throw error;
        }
        const confirmed = await verifyPersistedReport(requestId, userId, {
          title: payload.title,
          description: payload.description,
          county: payload.county,
          occurred_at: payload.occurred_at,
        });
        const report = { id: confirmed.id, title: data.title, description: data.description, county: data.county, road: data.road, occurred_at: data.occurred_at, latitude: data.latitude, longitude: data.longitude };
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await suggestIncidentDuplicates(supabaseAdmin, {
            type: "report",
            id: report.id,
            title: report.title,
            body: report.description,
            county: report.county,
            road: report.road,
            occurredAt: report.occurred_at,
            latitude: report.latitude,
            longitude: report.longitude,
          });
        } catch {
          // Duplicate review is additive and must not reject a valid submission.
        }
        return { ok: true as const, data: { id: confirmed.id, status: confirmed.status }, requestId };
      } catch (error) {
        return recordPersistenceDiagnostic(error, requestId, phase, recordId ? "update" : "create");
      }
    },
  );
