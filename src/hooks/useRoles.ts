import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "moderator" | "member";

export function useRoles() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: roles = [], isLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["my-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  return { roles, isAdmin, isModerator, canReview: isAdmin || isModerator, isLoading };
}

/** Public roles for a set of users, used for bylines (Editor, Moderator, Admin). */
export function useRoleLabels(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean))).sort();
  return useQuery({
    enabled: unique.length > 0,
    queryKey: ["role-labels", unique],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", unique);
      if (error) throw error;
      const map: Record<string, AppRole[]> = {};
      for (const row of data ?? []) {
        (map[row.user_id] ??= []).push(row.role as AppRole);
      }
      return map;
    },
  });
}

export function primaryRoleLabel(roles: AppRole[] | undefined): string {
  if (!roles) return "Contributor";
  if (roles.includes("admin")) return "Admin";
  if (roles.includes("moderator")) return "Moderator";
  return "Contributor";
}
