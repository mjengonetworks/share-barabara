import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfileNames(ids: string[]) {
  const unique = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ["profile-names", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, county")
        .in("id", unique);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.id] = row.display_name;
      return map;
    },
  });
}

export function useProfileAvatars(ids: string[]) {
  const unique = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ["profile-avatars", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", unique);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      for (const row of data ?? []) map[row.id] = row.avatar_url;
      return map;
    },
  });
}

export function useProfileUsernames(ids: string[]) {
  const unique = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ["profile-usernames", unique],
    enabled: unique.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", unique);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      for (const row of data ?? []) map[row.id] = row.username;
      return map;
    },
  });
}
