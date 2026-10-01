import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["notifications", user?.id];
  const seenRealtimeIds = useRef(new Set<string>());

  const { data: notifications = [] } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const { data: unreadTotal = 0 } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // The review migration is intentionally not live yet. If the new column is
  // unavailable, retain the existing foreground-browser behavior rather than
  // breaking in-app notifications.
  const { data: browserEnabled = { enabled: true } } = useQuery({
    queryKey: ["notification-browser-enabled", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from("notification_preferences") as any)
        .select("notifications_enabled,browser_enabled")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) return { enabled: true };
      return { enabled: data?.notifications_enabled !== false && data?.browser_enabled !== false };
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id?: string; type?: string; title?: string; body?: string };
          if (row.id && seenRealtimeIds.current.has(row.id)) return;
          if (row.id) seenRealtimeIds.current.add(row.id);
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", user.id] });
          const knownGroup = row.type === "nearby_alert" || row.type === "upvote" || row.type === "comment_reply" || row.type === "article_status" || row.type === "report_status";
          if (browserEnabled.enabled && knownGroup && typeof Notification !== "undefined" && Notification.permission === "granted") {
            if (row.title) new Notification(row.title, row.body ? { body: row.body } : {});
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, browserEnabled]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    notifications,
    unreadCount: unreadTotal,
    markRead: (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
  };
}
