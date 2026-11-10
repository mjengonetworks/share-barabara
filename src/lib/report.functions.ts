import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CasualtyBreakdown } from "@/components/site/party-casualty-inputs";
import { suggestIncidentDuplicates } from "@/lib/incident-duplicates";

type ReportSubmission = {
  requestId?: string;
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
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown } | null;
  const code = typeof candidate?.code === "string" && candidate.code.length <= 32 ? candidate.code : "UNKNOWN";
  const status = typeof candidate?.status === "number" ? candidate.status : undefined;
  const rawMessage = String(candidate?.message ?? "Database rejected the report.")
    .replace(/[\r\n]+/g, " ")
    .replace(/bearer\s+[a-z0-9._-]+/gi, "bearer [redacted]")
    .slice(0, 240);
  const message = /42501|PGRST301/i.test(code)
    ? "The current session is not authorized to save this report."
    : /23502|23503|22P02|PGRST204|PGRST205/i.test(code)
      ? "The database rejected one or more report fields."
      : /23505/i.test(code)
        ? "A conflicting report already exists."
        : rawMessage;
  return { requestId, phase, code, status, message };
}

function throwPersistenceDiagnostic(error: unknown, requestId: string, phase: string): never {
  const diagnostic = persistenceDiagnostic(error, requestId, phase);
  console.error("[CMS persistence failed]", {
    operation: "create",
    contentType: "report",
    requestId: diagnostic.requestId,
    phase: diagnostic.phase,
    code: diagnostic.code,
    status: diagnostic.status,
    message: diagnostic.message,
  });
  throw new Error(`CMS persistence failed [${diagnostic.code}] ${diagnostic.message} [requestId=${diagnostic.requestId}]`);
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
  status: "pending" | "approved",
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
    status,
  };
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

export const submitAccidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      data,
      context,
    }: {
      data: ReportSubmission;
      context: { supabase: SupabaseClient<Database>; userId: string };
    }) => {
      const requestId = diagnosticRequestId(data.requestId);
      const { requestedStatus = "pending" } = data;
      let phase = "role_lookup";
      try {
        const { data: roles, error: rolesError } = await context.supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", context.userId);
        if (rolesError) throw rolesError;

        const canPublish = (roles ?? []).some(
          (entry) => (roleRank[entry.role] ?? 0) >= roleRank.moderator,
        );
        const statusPayload = {
          status: canPublish && requestedStatus === "approved" ? "approved" : "pending",
        } as const;
        const status = statusPayload.status;
        phase = "schema_capability_probe";
        const [summary, incident_type] = await Promise.all([
          supportsColumn(context.supabase, "summary"),
          supportsColumn(context.supabase, "incident_type"),
        ]);
        // The allowlisted builder writes user_id: context.userId and never trusts
        // a browser-supplied owner value.
        const payload = buildAccidentReportPayload(data, context.userId, status, {
          summary,
          incident_type,
        });

        phase = "insert_returning_id";
        // The generated types still reflect the pre-nullability schema. Keep the
        // compatibility cast at this boundary until Supabase types are regenerated.
        const { data: report, error } = await context.supabase
          .from("accident_reports")
          .insert(payload as never)
          .select("id,title,description,county,road,occurred_at,latitude,longitude,status")
          .single();
        if (error) throw error;
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
        return { id: report.id, status: payload.status, requestId };
      } catch (error) {
        throwPersistenceDiagnostic(error, requestId, phase);
      }
    },
  );
