export type PersistenceDiagnostic = {
  requestId?: unknown;
  phase?: unknown;
  code?: unknown;
  status?: unknown;
  message?: unknown;
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
  "The database rejected one or more report fields.",
  "A conflicting report already exists.",
  "The database rejected the report.",
]);

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

export function serializePersistenceDiagnostic(diagnostic: PersistenceDiagnostic, context: PersistenceContext) {
  return `CMS persistence diagnostic ${JSON.stringify({
    requestId: diagnostic.requestId ?? context.requestId,
    phase: diagnostic.phase ?? "unavailable",
    code: diagnostic.code ?? "unavailable",
    status: diagnostic.status ?? "unavailable",
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
  const diagnostic = diagnosticFromError(error);
  const requestId = typeof diagnostic?.requestId === "string" && REQUEST_ID.test(diagnostic.requestId)
    ? diagnostic.requestId
    : REQUEST_ID.test(context.requestId) ? context.requestId : "unavailable";
  const message = typeof diagnostic?.message === "string" && SAFE_MESSAGES.has(diagnostic.message)
    ? diagnostic.message
    : "The database rejected the report.";
  const code = safeValue(diagnostic?.code, "unavailable", 32);
  const phase = safeValue(diagnostic?.phase, "unavailable", 48);
  const status = safeStatus(diagnostic?.status);
  return `CMS persistence failed: ${message} Error code ${code}; phase=${phase}; status=${status}; Request ID ${requestId}; operation=${context.operation}; contentType=${context.contentType}.`;
}
