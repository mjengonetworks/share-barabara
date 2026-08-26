import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Net upvotes (on a user's alerts, reports and comments — can go negative if
 *  downvotes outweigh upvotes) and the total stars they've received. Points
 *  drive account level; stars are a separate, purely rating-derived figure. */
export function useContributorScore(userId: string | undefined) {
  return useQuery({
    queryKey: ["contributor-score", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: alerts }, { data: reports }, { data: comments }, { data: ratings }] =
        await Promise.all([
          supabase.from("alerts").select("id").eq("user_id", userId!),
          supabase.from("accident_reports").select("id").eq("user_id", userId!),
          supabase.from("comments").select("id").eq("user_id", userId!),
          supabase.from("user_ratings").select("stars").eq("rated_user_id", userId!),
        ]);
      const entityIds = [
        ...(alerts ?? []).map((a) => a.id),
        ...(reports ?? []).map((r) => r.id),
        ...(comments ?? []).map((c) => c.id),
      ];
      let votePoints = 0;
      if (entityIds.length > 0) {
        const { data: votes } = await supabase
          .from("votes")
          .select("value")
          .in("entity_id", entityIds);
        votePoints = (votes ?? []).reduce((s, v) => s + v.value, 0);
      }
      const totalStars = (ratings ?? []).reduce((s, r) => s + r.stars, 0);
      return { votePoints, totalStars, ratingCount: (ratings ?? []).length };
    },
  });
}
