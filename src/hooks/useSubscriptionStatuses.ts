import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Batched active-subscription lookup, for showing the blue checkmark inline wherever a name appears. */
export function useSubscriptionStatuses(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter((id): id is string => !!id))).sort();
  return useQuery({
    queryKey: ["subscription-statuses", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id, active, expires_at")
        .in("user_id", unique);
      if (error) throw error;
      const map: Record<string, boolean> = {};
      for (const row of data ?? []) {
        map[row.user_id] = row.active && (!row.expires_at || new Date(row.expires_at) > new Date());
      }
      return map;
    },
  });
}
