import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHazardTypes } from "@/hooks/useTaxonomy";
import type { IncidentTaxonomyRow } from "@/lib/incident-taxonomy";

export function useIncidentTaxonomy() {
  const query = useHazardTypes();
  return {
    ...query,
    data: (query.data ?? []) as IncidentTaxonomyRow[],
  };
}

/** Keeps the public app safe before the review migration is applied. */
export function useReportIncidentTypeSchema() {
  return useQuery({
    queryKey: ["report-incident-type-schema"],
    queryFn: async () => {
      const { error } = await supabase
        .from("accident_reports")
        .select("incident_type")
        .limit(1);
      return !error;
    },
    staleTime: 5 * 60_000,
  });
}
