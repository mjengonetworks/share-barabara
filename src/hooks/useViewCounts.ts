import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** View counts per entity, for admin list rows. Counts raw view events; an
 *  entity with no event rows therefore has zero recorded views. Requires the
 *  applicable staff rank from the view-table RLS policies. */
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
      const { data, error } = await supabase.from(table).select(idColumn).in(idColumn, unique);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data as unknown as Record<string, string>[]) {
        const id = row[idColumn] as string;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    },
  });
}
