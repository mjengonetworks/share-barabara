import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CasualtyBreakdown } from "@/components/site/party-casualty-inputs";
import { suggestIncidentDuplicates } from "@/lib/incident-duplicates";

type ReportSubmission = {
  title: string;
  description: string;
  county: string;
  road: string;
  incident_type?: string | null;
  severity: string;
  occurred_at: string;
  vehicles_involved: number | null;
  casualties: number | null;
  fatalities: number | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  image_alt: string | null;
  image_caption: string | null;
  image_credit: string | null;
  road_id: string | null;
  parties_involved: string[];
  casualty_breakdown: CasualtyBreakdown;
  attachments: unknown[];
  page_id: string | null;
  is_anonymous: boolean;
};

const roleRank: Record<string, number> = {
  member: 0,
  guest_author: 1,
  author: 2,
  moderator: 3,
  editor: 4,
  admin: 5,
};

export const submitAccidentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      data,
      context,
    }: {
      data: ReportSubmission;
      context: { supabase: SupabaseClient<Database>; userId: string };
    }) => {
      const { data: roles, error: rolesError } = await context.supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId);
      if (rolesError) throw rolesError;

      const canPublish = (roles ?? []).some(
        (entry) => (roleRank[entry.role] ?? 0) >= roleRank.moderator,
      );
      const payload = {
        ...data,
        user_id: context.userId,
        status: canPublish ? "approved" : "pending",
      };

      // The generated types still reflect the pre-nullability schema. Keep the
      // compatibility cast at this boundary until Supabase types are regenerated.
      const { data: report, error } = await context.supabase
        .from("accident_reports")
        .insert(payload as never)
        .select("id,title,description,county,road,occurred_at,latitude,longitude,status")
        .single();
      if (error) throw error;
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await suggestIncidentDuplicates(supabaseAdmin, { type: "report", id: report.id, title: report.title, body: report.description, county: report.county, road: report.road, occurredAt: report.occurred_at, latitude: report.latitude, longitude: report.longitude });
      } catch {
        // Duplicate review is additive and must not reject a valid submission.
      }
      return { status: payload.status };
    },
  );
