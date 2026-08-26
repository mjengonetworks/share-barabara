import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      return data;
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
      return data;
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
      return data;
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
      return data;
    },
    staleTime: 60_000,
  });
}
