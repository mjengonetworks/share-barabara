import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { serverEnv } from "@/lib/runtime-env.server";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims: Record<string, unknown>;
};

export type ReportAuthResult =
  | { ok: true; context: AuthContext }
  | {
      ok: false;
      error: {
        requestId: string;
        phase: "authentication";
        code: string;
        status: number;
        message: string;
      };
    };

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (
      supabaseKey.startsWith("sb_publishable_") &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export async function resolveReportAuth(
  requestId: string,
  operation: "create" | "update" = "create",
): Promise<ReportAuthResult> {
  try {
    const url = serverEnv("SUPABASE_URL") ?? import.meta.env["VITE_SUPABASE_URL"];
    const key =
      serverEnv("SUPABASE_PUBLISHABLE_KEY") ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const token = getRequest()
      ?.headers?.get("authorization")
      ?.replace(/^Bearer\s+/, "");
    if (!url || !key || !token || token.split(".").length !== 3) throw new Error("unauthorized");
    const supabase = createClient<Database>(url, key, {
      global: { fetch: createSupabaseFetch(key), headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) throw new Error("unauthorized");
    return {
      ok: true,
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims as Record<string, unknown>,
      },
    };
  } catch (cause) {
    console.error("[CMS persistence failed]", {
      operation,
      contentType: "report",
      requestId,
      phase: "authentication",
      code: "AUTHENTICATION_FAILED",
      status: 401,
      message: "The current session is not authorized to save this report.",
      cause: cause instanceof Error ? cause.name : "unknown",
    });
    return {
      ok: false,
      error: {
        requestId,
        phase: "authentication",
        code: "AUTHENTICATION_FAILED",
        status: 401,
        message: "The current session is not authorized to save this report.",
      },
    };
  }
}
