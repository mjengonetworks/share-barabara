import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { serverEnv } from "@/lib/runtime-env.server";

/** Server-only public-data client. It deliberately uses the publishable key so
 * every Public AI read remains subject to Supabase RLS. */
export function createPublicSupabaseClient() {
  const url = serverEnv("SUPABASE_URL") ?? import.meta.env["VITE_SUPABASE_URL"];
  const key =
    serverEnv("SUPABASE_PUBLISHABLE_KEY") ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Public Supabase server configuration is missing");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
