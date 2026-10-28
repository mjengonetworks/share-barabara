import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Feature detection for the reviewed geography/transport schema. It fails
 * closed so existing production forms remain usable before approval/apply. */
export function useUnifiedGeographySchema() {
  return useQuery({
    queryKey: ["unified-geography-schema"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [countries, areas, entities, reports] = await Promise.all([
        supabase.from("countries" as never).select("iso_code, name").limit(1),
        supabase.from("admin_areas" as never).select("id").limit(1),
        supabase.from("transport_entities" as never).select("id").limit(1),
        supabase.from("accident_reports").select("country_code, admin_area_id, transport_mode, transport_entity_id").limit(1),
      ]);
      return {
        available: !countries.error && !areas.error && !entities.error && !reports.error,
        countriesAvailable: !countries.error,
        contentColumnsAvailable: !reports.error,
        administrativeAreasAvailable: !areas.error,
        transportEntitiesAvailable: !entities.error,
      };
    },
  });
}
