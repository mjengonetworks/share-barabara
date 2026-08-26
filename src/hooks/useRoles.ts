import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "moderator" | "editor" | "author" | "guest_author" | "member";

/** Mirrors public.role_rank(): each tier inherits everything below it. */
export const ROLE_RANK: Record<AppRole, number> = {
  member: 0,
  guest_author: 1,
  author: 2,
  moderator: 3,
  editor: 4,
  admin: 5,
};

export function roleRank(roles: AppRole[]): number {
  return roles.reduce((max, r) => Math.max(max, ROLE_RANK[r]), ROLE_RANK.member);
}

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

  const rank = roleRank(roles);
  const isAdmin = roles.includes("admin");
  const isEditor = roles.includes("editor");
  const isModerator = roles.includes("moderator");
  const isAuthor = roles.includes("author");
  const isGuestAuthor = roles.includes("guest_author");
  /** Report approval, comment moderation, statistics management: moderator and above. */
  const canReview = rank >= ROLE_RANK.moderator;
  /** Publish/reject articles submitted by others: moderator and above (same bar as
   *  report approval). A plain author/guest author can still edit their own work
   *  per keepsArticleRightsAfterPublish, but can't touch anyone else's. */
  const canPublishArticles = rank >= ROLE_RANK.moderator;
  /** Keep edit/delete rights on an article after it is published: author and above. */
  const keepsArticleRightsAfterPublish = rank >= ROLE_RANK.author;

  return {
    roles,
    rank,
    isAdmin,
    isEditor,
    isModerator,
    isAuthor,
    isGuestAuthor,
    canReview,
    canPublishArticles,
    keepsArticleRightsAfterPublish,
    isLoading,
  };
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
  if (roles.includes("editor")) return "Editor";
  if (roles.includes("moderator")) return "Moderator";
  if (roles.includes("author")) return "Author";
  if (roles.includes("guest_author")) return "Guest author";
  return "Contributor";
}
