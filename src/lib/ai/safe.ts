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
    if (url.username || url.password || isPrivateIp(url.hostname)) return null;
    return {
      id,
      title: value["title"].slice(0, 200),
      url: url.href,
      domain: url.hostname,
      ...(typeof value["snippet"] === "string" ? { snippet: value["snippet"].slice(0, 500) } : {}),
      ...(typeof value["sourceId"] === "string" ? { sourceId: value["sourceId"].slice(0, 80) } : {}),
      ...(typeof value["publishedAt"] === "string" ? { publishedAt: value["publishedAt"].slice(0, 80) } : {}),
    };
  } catch {
    return null;
  }
}

function isPrivateIp(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "0.0.0.0" || host === "255.255.255.255" || host === "169.254.169.254") return true;
  if (host.includes(":")) return host === "::" || host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd");
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 169 && parts[1] === 254);
}

export function clampText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
