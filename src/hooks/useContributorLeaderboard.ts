import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContributorLeaderboardRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  rank_position: number;
  published_articles: number;
  approved_reports: number;
  active_alerts: number;
};

export function useContributorLeaderboard({
  search = "",
  limit = 25,
  offset = 0,
  userId,
}: {
  search?: string;
  limit?: number;
  offset?: number;
  userId?: string;
  enabled?: boolean;
} = {}) {
  return useQuery({
    queryKey: ["contributor-leaderboard", search, limit, offset, userId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_contributor_leaderboard", {
        _limit: limit,
        _offset: offset,
        _query: search.trim() || null,
        _user_id: userId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as ContributorLeaderboardRow[];
    },
  });
}
