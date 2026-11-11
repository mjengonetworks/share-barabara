import { supabase } from "@/integrations/supabase/client";

export type AccidentReportApiResult =
  | { ok: true; outcome: "confirmed"; requestId: string; operation: "create" | "update"; contentType: "report"; data: { id: string; status: string } }
  | { ok: false; outcome: "failure" | "uncertain"; requestId: string; operation: "create" | "update"; contentType: "report"; error: { requestId?: unknown; phase?: unknown; code?: unknown; status?: unknown; outcome?: unknown; message?: unknown } };

export async function saveAccidentReport(input: { id?: string; requestId: string; payload: Record<string, unknown> }): Promise<AccidentReportApiResult> {
  const operation = input.id ? "update" : "create";
  try {
    const { data } = await supabase.auth.getSession();
    const response = await fetch(input.id ? `/api/admin/accident-reports/${encodeURIComponent(input.id)}` : "/api/admin/accident-reports", {
      method: input.id ? "PUT" : "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-request-id": input.requestId, ...(data.session?.access_token ? { authorization: `Bearer ${data.session.access_token}` } : {}) },
      body: JSON.stringify({ ...input.payload, ...(input.id ? { id: input.id } : {}) }),
    });
    const body = await response.json().catch(() => null) as AccidentReportApiResult | null;
    if (body && typeof body === "object" && "ok" in body) return body;
    return { ok: false, outcome: "failure", requestId: input.requestId, operation, contentType: "report", error: { requestId: input.requestId, phase: "transport", code: "UNEXPECTED_SERVER_FAILURE", status: response.status, message: "The report save could not be completed by the server." } };
  } catch {
    return { ok: false, outcome: "uncertain", requestId: input.requestId, operation, contentType: "report", error: { requestId: input.requestId, phase: "transport", code: "PERSISTENCE_UNCERTAIN", status: 503, outcome: "uncertain", message: "The write outcome could not be confirmed." } };
  }
}
