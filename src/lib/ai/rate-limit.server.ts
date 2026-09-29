import { getRequest } from "@tanstack/react-start/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 5_000;

function requestIdentity() {
  const request = getRequest();
  const headers = request?.headers;
  return (
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-real-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  ).slice(0, 100);
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size <= MAX_BUCKETS) return;
  const oldest = [...buckets.entries()]
    .sort(([, a], [, b]) => a.resetAt - b.resetAt)
    .slice(0, buckets.size - MAX_BUCKETS);
  for (const [key] of oldest) buckets.delete(key);
}

async function enforceCloudflareLimit(scope: string, key: string) {
  const runtimeEnv = (globalThis as typeof globalThis & { __env__?: Record<string, unknown> })
    .__env__;
  const binding = runtimeEnv?.["AI_RATE_LIMITER"] as
    | { limit: (input: { key: string }) => Promise<{ success: boolean }> }
    | undefined;
  if (!binding) return false;
  const result = await binding.limit({ key: `share-barabara-ai:${scope}:${key}` });
  if (!result.success) throw new Error("AI request limit reached");
  return true;
}

/** Uses a Cloudflare Rate Limiting binding when configured, with a bounded
 * process-local fallback for local development and preview environments. */
export async function enforceAIRateLimit(
  scope: "summary" | "chat" | "editorial" | "external",
  userId?: string,
) {
  const now = Date.now();
  const ip = requestIdentity();
  const keys = userId ? [`user:${userId}`] : [];
  keys.push(`ip:${ip}`);
  for (const key of keys) {
    await enforceCloudflareLimit(scope, key);
  }
  prune(now);
  const limits: Record<typeof scope, number> = {
    summary: 10,
    chat: 30,
    editorial: 20,
    external: 10,
  };
  for (const key of keys.map((value) => `ai:${scope}:${value}`)) {
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      continue;
    }
    if (current.count >= limits[scope]) throw new Error("AI request limit reached");
    current.count += 1;
  }
}

export function resetAIRateLimitsForTests() {
  buckets.clear();
}
