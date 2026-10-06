import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { suggestIncidentDuplicates } from "@/lib/incident-duplicates";

export const submitAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: Record<string, unknown>; context: { supabase: any; userId: string } }) => {
    const payload = { ...data, user_id: context.userId };
    const { data: alert, error } = await context.supabase.from("alerts").insert(payload).select("id,title,description,county,road,hazard_type,created_at,latitude,longitude,status").single();
    if (error) throw error;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await suggestIncidentDuplicates(supabaseAdmin, { type: "alert", id: alert.id, title: alert.title, body: alert.description, county: alert.county, road: alert.road, incidentType: alert.hazard_type, occurredAt: alert.created_at, latitude: alert.latitude, longitude: alert.longitude });
    } catch {
      // Duplicate review is additive and must never make a valid submission fail.
    }
    return alert;
  });
