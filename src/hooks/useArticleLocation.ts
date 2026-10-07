import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Feature-detects the optional Article location columns so the public
 * application remains usable before the review migration is applied. */
export function useArticleLocationSchema() {
  return useQuery({
    queryKey: ["article-location-schema"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { error } = await supabase
        .from("news")
        .select("location_label, location_type, county, road, latitude, longitude")
        .limit(1);
      return !error;
    },
  });
}
