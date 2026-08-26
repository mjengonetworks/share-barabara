import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function tally(rows: { id: string | null }[][]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of rows) {
    for (const row of table) {
      if (!row.id) continue;
      counts[row.id] = (counts[row.id] ?? 0) + 1;
    }
  }
  return counts;
}

function topIds(counts: Record<string, number>, limit: number): { id: string; count: number }[] {
  return Object.entries(counts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Top Pages by alerts + reports + articles + comments posted in the window. */
export function usePageLeaderboard(days: number, limit = 5) {
  return useQuery({
    queryKey: ["page-leaderboard", days, limit],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [alerts, reports, news, comments] = await Promise.all([
        supabase.from("alerts").select("page_id").gte("created_at", since),
        supabase.from("accident_reports").select("page_id").gte("created_at", since),
        supabase.from("news").select("page_id").gte("created_at", since),
        supabase.from("comments").select("page_id").gte("created_at", since),
      ]);
      for (const r of [alerts, reports, news, comments]) if (r.error) throw r.error;
      const counts = tally([
        (alerts.data ?? []).map((r) => ({ id: r.page_id })),
        (reports.data ?? []).map((r) => ({ id: r.page_id })),
        (news.data ?? []).map((r) => ({ id: r.page_id })),
        (comments.data ?? []).map((r) => ({ id: r.page_id })),
      ]);
      return topIds(counts, limit);
    },
  });
}

/** Top contributor profiles by alerts + reports + comments posted in the window. */
export function useProfileLeaderboard(days: number, limit = 5) {
  return useQuery({
    queryKey: ["profile-leaderboard", days, limit],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [alerts, reports, comments] = await Promise.all([
        supabase.from("alerts").select("user_id").gte("created_at", since),
        supabase.from("accident_reports").select("user_id").gte("created_at", since),
        supabase.from("comments").select("user_id").gte("created_at", since),
      ]);
      for (const r of [alerts, reports, comments]) if (r.error) throw r.error;
      const counts = tally([
        (alerts.data ?? []).map((r) => ({ id: r.user_id })),
        (reports.data ?? []).map((r) => ({ id: r.user_id })),
        (comments.data ?? []).map((r) => ({ id: r.user_id })),
      ]);
      return topIds(counts, limit);
    },
  });
}
