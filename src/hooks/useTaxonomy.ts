import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Task 30 keeps the old schema readable before the review migration is
 * applied. Rows from that schema have no `active` field and are therefore
 * treated as active; once the migration exists, archived rows are excluded
 * from public pickers and filters.
 */
function activeOnly<T extends { active?: boolean }>(rows: T[] | null) {
  return (rows ?? []).filter((row) => row.active !== false);
}

/** Admin-manageable category/type/severity lists that drive picker options
 *  across articles, alerts and reports. Falls back to an empty list (callers
 *  already handle that) rather than throwing if the table is briefly empty. */

export function useNewsCategories() {
  return useQuery({
    queryKey: ["news-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return activeOnly(data);
    },
    staleTime: 60_000,
  });
}

export function useHazardTypes() {
  return useQuery({
    queryKey: ["hazard-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hazard_types")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return activeOnly(data);
    },
    staleTime: 60_000,
  });
}

export function useAlertSeverities() {
  return useQuery({
    queryKey: ["alert-severities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_severities")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return activeOnly(data);
    },
    staleTime: 60_000,
  });
}

export function useReportSeverities() {
  return useQuery({
    queryKey: ["report-severities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_severities")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return activeOnly(data);
    },
    staleTime: 60_000,
  });
}
