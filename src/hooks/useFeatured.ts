import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Deterministic per-day pick so it looks random but is stable for the whole day, and a
 *  different index on a paired slot (home vs campaigns) so the two never coincide. */
function dayPick<T>(items: T[], offset: number): T | null {
  if (items.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / 86400000);
  return items[(dayIndex + offset) % items.length] ?? null;
}

type FeaturedSlot = "home_profile" | "campaigns_profile";

export function useFeaturedProfile(slot: FeaturedSlot) {
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
        userId = dayPick(eligible, slot === "campaigns_profile" ? 1 : 0);
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

type FeaturedPageSlot = "home_page" | "campaigns_page";

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
        pageId = dayPick(eligible, slot === "campaigns_page" ? 1 : 0);
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
