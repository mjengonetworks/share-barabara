import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRoadsByIds(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter((id): id is string => !!id))).sort();
  return useQuery({
    queryKey: ["roads-by-ids", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roads")
        .select("id, name, slug")
        .in("id", unique);
      if (error) throw error;
      const map: Record<string, { name: string; slug: string }> = {};
      for (const r of data ?? []) map[r.id] = { name: r.name, slug: r.slug };
      return map;
    },
  });
}
