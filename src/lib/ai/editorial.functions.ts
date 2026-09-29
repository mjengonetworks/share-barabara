import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enforceAIRateLimit } from "./rate-limit.server";

export type EditorialContentType = "article" | "alert" | "report";
export type EditorialMode = "generate" | "autopopulate" | "update";
type EditorialDraft = Record<string, string | number | null>;
export type EditorialProposal = {
  contentType: EditorialContentType;
  contentId: string;
  current: Record<string, string | number | null>;
  proposed: EditorialDraft;
  changedFields: string[];
};

// role_rank('moderator') includes moderator, editor and admin. Keep this
// server-side allowlist aligned with that hierarchy.
const editorialRoles = new Set(["moderator", "editor", "admin"]);

function fieldsFor(contentType: EditorialContentType): string[] {
  return contentType === "article"
    ? ["title", "summary", "body"]
    : contentType === "alert"
      ? ["title", "description", "county", "road", "hazard_type", "severity"]
      : [
          "title",
          "description",
          "county",
          "road",
          "severity",
          "occurred_at",
          "vehicles_involved",
          "casualties",
          "fatalities",
        ];
}

function parseDraft(contentType: EditorialContentType, answer: string): EditorialDraft {
  const parsed = JSON.parse(answer) as Record<string, unknown>;
  const fields = fieldsFor(contentType);
  const draft: EditorialDraft = {};
  for (const field of fields) {
    const value = parsed[field];
    if (contentType === "report" && ["vehicles_involved", "casualties", "fatalities"].includes(field)) {
      if (value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0)) {
        draft[field] = value;
      }
    } else if (typeof value === "string" || typeof value === "number" || value === null) {
      draft[field] = value;
    }
  }
  if (Object.keys(draft).length === 0) throw new Error("Editorial AI returned no usable fields");
  return draft;
}

function editorialPrompt(
  contentType: EditorialContentType,
  mode: EditorialMode,
  source: string,
  instruction?: string,
) {
  return [
    `Return only valid JSON with these fields: ${fieldsFor(contentType).join(", ")}.`,
    mode === "update"
      ? "This is an update proposal. Preserve existing valid information unless the new material directly supports a change. Do not rewrite for style alone. Never invent facts, coordinates, casualties, timing, closures, classifications, or official instructions."
      : "Draft from the supplied Share Barabara evidence only. Do not invent facts, coordinates, casualties, timing, closures, classifications, or official instructions.",
    contentType === "report"
      ? "For vehicles_involved, casualties (injured people), and fatalities (deaths): null means not confirmed and must remain null unless the new evidence explicitly confirms a number; zero means confirmed zero. Never turn unknown into zero."
      : "",
    `Content type: ${contentType}.`,
    instruction?.trim() ? `Editor instruction: ${instruction.trim().slice(0, 2000)}` : "",
    `Evidence:\n${source.slice(0, 12000)}`,
  ].filter(Boolean).join("\n");
}

function currentFields(record: Record<string, unknown>, contentType: EditorialContentType) {
  const current: Record<string, string | number | null> = {};
  for (const field of fieldsFor(contentType)) {
    const value = record[field];
    if (typeof value === "string" || typeof value === "number" || value === null)
      current[field] = value;
  }
  return current;
}

function recordEvidence(record: Record<string, unknown>, contentType: EditorialContentType) {
  return fieldsFor(contentType)
    .map((field) => `${field}: ${record[field] === null || record[field] === undefined ? "Not confirmed" : record[field]}`)
    .join("\n");
}

function preserveExistingUpdateValues(
  contentType: EditorialContentType,
  current: Record<string, string | number | null>,
  proposed: EditorialDraft,
) {
  const preserved = { ...proposed };
  for (const [field, currentValue] of Object.entries(current)) {
    const proposedValue = proposed[field];
    const currentIsKnown =
      currentValue !== null && (typeof currentValue !== "string" || currentValue.trim().length > 0);
    if (currentIsKnown && (proposedValue === null || (typeof proposedValue === "string" && !proposedValue.trim()))) {
      preserved[field] = currentValue;
    }
    if (
      contentType === "report" &&
      ["vehicles_involved", "casualties", "fatalities"].includes(field) &&
      currentValue === null &&
      typeof proposedValue === "number"
    ) {
      preserved[field] = null;
    }
  }
  return preserved;
}

async function resolveEditorialRecord(
  db: SupabaseClient<Database>,
  contentType: EditorialContentType,
  contentId: string,
) {
  const table = contentType === "article" ? "news" : contentType === "alert" ? "alerts" : "accident_reports";
  const select =
    contentType === "article"
      ? "id,title,summary,body,status,author_id"
      : contentType === "alert"
        ? "id,title,description,county,road,hazard_type,severity,status,user_id"
        : "id,title,description,county,road,severity,occurred_at,vehicles_involved,casualties,fatalities,status,user_id";
  const { data, error } = await db.from(table).select(select).eq("id", contentId).maybeSingle();
  if (error || !data) throw new Error("The saved record is unavailable for editorial review");
  return data as unknown as Record<string, unknown>;
}

export const generateEditorialDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      data,
      context,
    }: {
      data: unknown;
      context: {
        claims: Record<string, unknown>;
        supabase: SupabaseClient<Database>;
        userId: string;
      };
    }) => {
      const input = (data ?? {}) as {
        contentType?: EditorialContentType;
        mode?: EditorialMode;
        source?: string;
        contentId?: string;
        instruction?: string;
      };
      const contentType = input.contentType;
      const mode = input.mode ?? "generate";
      if (!contentType || !["article", "alert", "report"].includes(contentType))
        throw new Error("Invalid editorial content type");
      if (!["generate", "autopopulate", "update"].includes(mode))
        throw new Error("Invalid editorial AI mode");
      const claims = context.claims;
      // Editorial generation is deliberately not exposed to public AI. Role checks
      // must remain on the server even when a CMS client is compromised.
      if (!claims["sub"]) throw new Error("Unauthorized");
      const { data: roles } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId);
      if (!(roles ?? []).some((role: { role: string }) => editorialRoles.has(role.role)))
        throw new Error("Editorial AI requires an approved contributor role");
      let source = input.source?.trim() ?? "";
      let current: Record<string, string | number | null> = {};
      if (mode === "update") {
        if (!input.contentId) throw new Error("A saved record is required for Update with AI");
        const record = await resolveEditorialRecord(context.supabase, contentType, input.contentId);
        current = currentFields(record, contentType);
        if (!source) throw new Error("New update material is required");
        source = `AUTHORITATIVE CURRENT CONTENT:\n${recordEvidence(record, contentType)}\n\nNEW UPDATE MATERIAL:\n${source}`;
      }
      if (!source) throw new Error("Source material is required");
      await enforceAIRateLimit("editorial", context.userId);
      const { completeWithProvider } = await import("./providers.server");
      const result = await completeWithProvider("grok", {
        mode: "editorial",
        message: editorialPrompt(contentType, mode, source, input.instruction),
        evidence: [],
        history: [],
      });
      if (!result.ok)
        throw new Error(
          result.error === "not_configured"
            ? "Editorial AI is not configured"
            : "Editorial AI is unavailable",
      );
      try {
        const proposed = preserveExistingUpdateValues(contentType, current, parseDraft(contentType, result.answer));
        if (mode === "update") {
          return {
            proposal: {
              contentType,
              contentId: input.contentId!,
              current,
              proposed,
              changedFields: Object.keys(proposed).filter((field) => proposed[field] !== current[field]),
            } satisfies EditorialProposal,
          };
        }
        return { draft: proposed };
      } catch {
        throw new Error("Editorial AI returned an invalid draft");
      }
    },
  );
