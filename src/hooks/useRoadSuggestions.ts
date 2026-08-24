import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRoadSuggestions(query: string) {
  return useQuery({
    queryKey: ["road-suggestions", query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roads")
        .select("id, name, slug")
        .ilike("name", `%${query.trim()}%`)
        .order("name")
        .limit(8);
      if (error) throw error;
      return data;
    },
  });
}
