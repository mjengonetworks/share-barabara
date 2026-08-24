import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type EntityType = "alert" | "report" | "comment";

/** Vote scores for a batch of entities of the same type, plus a toggle-vote mutator. */
export function useVotes(entityType: EntityType, entityIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ids = Array.from(new Set(entityIds)).sort();
  const key = ["votes", entityType, ids];

  const { data: votes = [] } = useQuery({
    queryKey: key,
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("entity_id, value, user_id")
        .eq("entity_type", entityType)
        .in("entity_id", ids);
      if (error) throw error;
      return data;
    },
  });

  const scores: Record<string, { net: number; mine: number }> = {};
  for (const id of ids) scores[id] = { net: 0, mine: 0 };
  for (const v of votes) {
    const entry = (scores[v.entity_id] ??= { net: 0, mine: 0 });
    entry.net += v.value;
    if (v.user_id === user?.id) entry.mine = v.value;
  }

  const cast = useMutation({
    mutationFn: async ({ entityId, value }: { entityId: string; value: 1 | -1 }) => {
      if (!user) throw new Error("Sign in to vote");
      const existing = scores[entityId]?.mine ?? 0;
      if (existing === value) {
        const { error } = await supabase
          .from("votes")
          .delete()
          .eq("user_id", user.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("votes")
          .upsert(
            { user_id: user.id, entity_type: entityType, entity_id: entityId, value },
            { onConflict: "user_id,entity_type,entity_id" },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["votes", entityType] }),
  });

  return { scores, vote: (entityId: string, value: 1 | -1) => cast.mutate({ entityId, value }) };
}
