import type { TrustedCitation } from "./types";

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_EVIDENCE_RECORDS = 8;
export const MAX_EVIDENCE_CHARS = 16000;
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_OUTPUT_CHARS = 5000;

export function normalizeAIError(error: unknown): "provider_unavailable" {
  console.error(
    "[Share Barabara AI] provider failure",
    error instanceof Error ? error.name : "unknown",
  );
  return "provider_unavailable";
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

export function validateCitation(input: unknown, id: number): TrustedCitation | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (typeof value["title"] !== "string" || typeof value["url"] !== "string") return null;
  try {
    const url = new URL(value["url"]);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (isPrivateHostname(url.hostname)) return null;
    return {
      id,
      title: value["title"].slice(0, 200),
      url: url.href,
      domain: url.hostname,
      ...(typeof value["snippet"] === "string" ? { snippet: value["snippet"].slice(0, 500) } : {}),
    };
  } catch {
    return null;
  }
}

export function clampText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
