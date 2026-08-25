import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePagesByIds(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter((id): id is string => !!id))).sort();
  return useQuery({
    queryKey: ["pages-by-ids", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("id, name, slug, verified")
        .in("id", unique);
      if (error) throw error;
      const map: Record<string, { name: string; slug: string; verified: boolean }> = {};
      for (const p of data ?? []) map[p.id] = { name: p.name, slug: p.slug, verified: p.verified };
      return map;
    },
  });
}
