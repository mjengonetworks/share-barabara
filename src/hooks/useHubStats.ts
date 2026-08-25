import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHubStats() {
  return useQuery({
    queryKey: ["hub-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hub_stats")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
