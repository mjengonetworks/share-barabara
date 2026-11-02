import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** View counts per entity, for admin list rows. Uses exact server-side counts
 *  so PostgREST's response-row limit cannot turn recorded views into zeroes.
 *  RLS still comes from the canonical view table for the current staff role. */
export function useViewCounts(
  table: "news_views" | "accident_report_views" | "alert_views",
  idColumn: "news_id" | "report_id" | "alert_id",
  ids: string[],
) {
  const unique = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ["view-counts", table, unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(unique.map(async (id) => {
        const { count, error } = await (supabase.from(table) as any)
          .select(idColumn, { count: "exact", head: true })
          .eq(idColumn, id);
        if (error) throw error;
        return [id, count ?? 0] as const;
      }));
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });
}
