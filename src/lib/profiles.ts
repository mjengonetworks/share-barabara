import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfileNames(ids: string[]) {
  const unique = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ["profile-names", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, county")
        .in("id", unique);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.id] = row.display_name;
      return map;
    },
  });
}