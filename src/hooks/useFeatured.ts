import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Deterministic per-period pick so it looks random but is stable for the whole day/week, and
 *  a different index on a paired slot (home vs campaigns) so the two never coincide. */
function periodPick<T>(items: T[], period: "day" | "week", offset: number): T | null {
  if (items.length === 0) return null;
  const ms = period === "week" ? 7 * 86400000 : 86400000;
  const index = Math.floor(Date.now() / ms);
  return items[(index + offset) % items.length] ?? null;
}

type FeaturedProfileSlot =
  "home_profile" | "campaigns_profile_of_day" | "campaigns_profile_of_week";

/** Random fallback only ever draws from members with an active (paid) subscription. */
export function useFeaturedProfile(slot: FeaturedProfileSlot) {
  return useQuery({
    queryKey: ["featured-profile", slot],
    queryFn: async () => {
      const { data: pick } = await supabase
        .from("featured_picks")
        .select("user_id")
        .eq("slot", slot)
        .maybeSingle();

      let userId = pick?.user_id ?? null;

      if (!userId) {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("user_id, expires_at")
          .eq("active", true);
        const eligible = (subs ?? [])
          .filter((s) => !s.expires_at || new Date(s.expires_at) > new Date())
          .map((s) => s.user_id)
          .sort();
        const period = slot === "campaigns_profile_of_week" ? "week" : "day";
        const offset = slot === "campaigns_profile_of_day" ? 1 : 0;
        userId = periodPick(eligible, period, offset);
      }
      if (!userId) return null;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return profile;
    },
  });
}

type FeaturedPageSlot =
  | "home_page"
  | "campaigns_page_of_day"
  | "campaigns_page_of_week"
  | "pages_of_day"
  | "pages_of_week";

/** Random fallback only ever draws from verified (premium subscribed) pages. */
export function useFeaturedPage(slot: FeaturedPageSlot) {
  return useQuery({
    queryKey: ["featured-page", slot],
    queryFn: async () => {
      const { data: pick } = await supabase
        .from("featured_picks")
        .select("page_id")
        .eq("slot", slot)
        .maybeSingle();

      let pageId = pick?.page_id ?? null;

      if (!pageId) {
        const { data: verifiedPages } = await supabase
          .from("pages")
          .select("id")
          .eq("verified", true);
        const eligible = (verifiedPages ?? []).map((p) => p.id).sort();
        const period =
          slot === "pages_of_week" || slot === "campaigns_page_of_week" ? "week" : "day";
        const offset = slot === "campaigns_page_of_day" ? 1 : 0;
        pageId = periodPick(eligible, period, offset);
      }
      if (!pageId) return null;

      const { data: page, error } = await supabase
        .from("pages")
        .select("*")
        .eq("id", pageId)
        .maybeSingle();
      if (error) throw error;
      return page;
    },
  });
}
