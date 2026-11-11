export type PersistenceDiagnostic = {
  requestId?: unknown;
  phase?: unknown;
  code?: unknown;
  status?: unknown;
  message?: unknown;
  outcome?: unknown;
};

type PersistenceContext = {
  requestId: string;
  operation: string;
  contentType: string;
};

export type PersistenceOperation = "create" | "update" | "unknown";

const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_MESSAGES = new Set([
  "The current session is not authorized to save this report.",
  "The report fields are invalid.",
  "The report title is required.",
  "The incident description is required.",
  "The report county is required.",
  "The database rejected one or more report fields.",
  "A conflicting report already exists.",
  "The database rejected the report.",
  "The write outcome could not be confirmed.",
  "The report save could not be completed by the server.",
  "The report save failed before a database result was available.",
]);

const LOCAL_VALIDATION_ERRORS: Record<string, PersistenceDiagnostic> = {
  "Sign in required": { phase: "authentication", code: "AUTHENTICATION_FAILED", status: 401, message: "The current session is not authorized to save this report.", outcome: "failure" },
  "Report title is required": { phase: "validation", code: "TITLE_REQUIRED", status: 400, message: "The report title is required.", outcome: "failure" },
  "Incident description is required": { phase: "validation", code: "DESCRIPTION_REQUIRED", status: 400, message: "The incident description is required.", outcome: "failure" },
  "County is required": { phase: "validation", code: "COUNTY_REQUIRED", status: 400, message: "The report county is required.", outcome: "failure" },
  "Occurrence date and time are required": { phase: "validation", code: "REPORT_FIELDS_INVALID", status: 400, message: "The report fields are invalid.", outcome: "failure" },
};

function safeValue(value: unknown, fallback: string, maxLength = 64) {
  return typeof value === "string" && value.length > 0
    ? value.replace(/[^a-zA-Z0-9_.:/ -]/g, "").slice(0, maxLength) || fallback
    : fallback;
}

function safeStatus(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "unavailable";
}

function diagnosticFromError(error: unknown): PersistenceDiagnostic | null {
  if (error && typeof error === "object" && "error" in error) {
    const nested = (error as { error?: unknown }).error;
    if (nested && typeof nested === "object") return nested as PersistenceDiagnostic;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  const serialized = message.match(/^CMS persistence diagnostic (\{.*\})$/);
  if (serialized) {
    try {
      return JSON.parse(serialized[1]) as PersistenceDiagnostic;
    } catch {
      return null;
    }
  }
  return null;
}

function localValidationDiagnostic(error: unknown): PersistenceDiagnostic | null {
  return error instanceof Error ? LOCAL_VALIDATION_ERRORS[error.message] ?? null : null;
}

export function serializePersistenceDiagnostic(diagnostic: PersistenceDiagnostic, context: PersistenceContext) {
  return `CMS persistence diagnostic ${JSON.stringify({
    requestId: diagnostic.requestId ?? context.requestId,
    phase: diagnostic.phase ?? "unavailable",
    code: diagnostic.code ?? "unavailable",
    status: diagnostic.status ?? "unavailable",
    outcome: diagnostic.outcome ?? "failure",
    message: diagnostic.message,
    operation: context.operation,
    contentType: context.contentType,
  })}`;
}

/** Build a transport-safe Error for failures that happen before a server
 * function reaches its content-specific handler, such as authentication. */
export function persistenceDiagnosticError(
  diagnostic: PersistenceDiagnostic,
  context: PersistenceContext,
) {
  return new Error(serializePersistenceDiagnostic(diagnostic, context));
}

export function renderPersistenceError(error: unknown, context: PersistenceContext) {
  const diagnostic = diagnosticFromError(error) ?? localValidationDiagnostic(error);
  const requestId = typeof diagnostic?.requestId === "string" && REQUEST_ID.test(diagnostic.requestId)
    ? diagnostic.requestId
    : REQUEST_ID.test(context.requestId) ? context.requestId : "unavailable";
  const message = typeof diagnostic?.message === "string" && SAFE_MESSAGES.has(diagnostic.message)
    ? diagnostic.message
    : "The report save failed before a database result was available.";
  const outcome = diagnostic?.outcome === "uncertain" ? "uncertain" : "failure";
  const code = safeValue(diagnostic?.code, "unavailable", 32);
  const phase = safeValue(diagnostic?.phase, "unavailable", 48);
  const status = safeStatus(diagnostic?.status);
  const prefix = outcome === "uncertain"
    ? "CMS persistence uncertain"
    : diagnostic?.phase === "validation" ? "CMS validation failed" : "CMS persistence failed";
  return `${prefix}: ${message} Error code ${code}; phase=${phase}; status=${status}; Request ID ${requestId}; operation=${context.operation}; contentType=${context.contentType}.`;
}
