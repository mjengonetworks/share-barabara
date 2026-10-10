import { safeInternalReturnTo } from "./ai/return-to-ai";

const RETURN_KEY = "sb_auth_return_to";

// Keep callbacks identical to the Supabase allowlist. Query parameters cause
// staging callbacks to be rejected and fall back to the production Site URL.
export function authCallbackUrl(origin: string, recovery = false): string {
  return new URL(recovery ? "/auth/reset" : "/auth", origin).toString();
}

export function rememberAuthReturnTo(storage: Storage, value: unknown): void {
  const destination = safeInternalReturnTo(value);
  if (destination) storage.setItem(RETURN_KEY, destination);
  else storage.removeItem(RETURN_KEY);
}

export function consumeAuthReturnTo(storage: Storage, value: unknown): string {
  const stored = storage.getItem(RETURN_KEY);
  storage.removeItem(RETURN_KEY);
  return safeInternalReturnTo(value) ?? safeInternalReturnTo(stored) ?? "/dashboard";
}
