import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Net upvotes on a user's alerts/reports (points), and the total stars they've received. */
export function useContributorScore(userId: string | undefined) {
  return useQuery({
    queryKey: ["contributor-score", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: alerts }, { data: reports }, { data: ratings }] = await Promise.all([
        supabase.from("alerts").select("id").eq("user_id", userId!),
        supabase.from("accident_reports").select("id").eq("user_id", userId!),
        supabase.from("user_ratings").select("stars").eq("rated_user_id", userId!),
      ]);
      const entityIds = [...(alerts ?? []).map((a) => a.id), ...(reports ?? []).map((r) => r.id)];
      let points = 0;
      if (entityIds.length > 0) {
        const { data: votes } = await supabase
          .from("votes")
          .select("value")
          .in("entity_id", entityIds);
        points = (votes ?? []).reduce((s, v) => s + v.value, 0);
      }
      const totalStars = (ratings ?? []).reduce((s, r) => s + r.stars, 0);
      return { points, totalStars, ratingCount: (ratings ?? []).length };
    },
  });
}
