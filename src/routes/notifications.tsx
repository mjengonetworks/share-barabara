import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useGeolocation } from "@/hooks/useGeolocation";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications: Share Barabara" },
      {
        name: "description",
        content:
          "Your Share Barabara notifications: nearby alerts, replies, upvotes and submission updates.",
      },
    ],
  }),
  component: NotificationsPage,
});

type Prefs = {
  articles: boolean;
  reports: boolean;
  alerts: boolean;
  interactions: boolean;
  radius_km: number;
  latitude: number | null;
  longitude: number | null;
};

const DEFAULT_PREFS: Prefs = {
  articles: true,
  reports: true,
  alerts: true,
  interactions: true,
  radius_km: 20,
  latitude: null,
  longitude: null,
};

function NotificationsPage() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const queryClient = useQueryClient();
  const { locate, loading: locating } = useGeolocation();
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      setPrefs(data ?? { ...DEFAULT_PREFS });
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (next: Prefs) => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ ...next, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notification preferences saved");
      queryClient.invalidateQueries({ queryKey: ["notification-prefs", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-[1.05rem] font-bold">Sign in to see your notifications</h1>
        <Button asChild className="mt-4">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  const p = prefs ?? DEFAULT_PREFS;
  const set = (patch: Partial<Prefs>) => setPrefs({ ...p, ...patch });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">
        Your account
      </p>
      <h1 className="mt-2 flex items-center gap-2 text-[1.575rem] font-extrabold">
        <Bell className="size-8 text-accent" /> Notifications
      </h1>

      <section className="mt-8 rounded-lg border border-border bg-card p-6 card-elevated">
        <h2 className="text-lg font-bold">Preferences</h2>
        <div className="mt-4 space-y-4">
          {(
            [
              ["articles", "New articles"],
              ["reports", "New accident reports"],
              ["alerts", "Hazard alerts near me"],
              ["interactions", "Upvotes and replies to me"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key}>{label}</Label>
              <Switch id={key} checked={p[key]} onCheckedChange={(v) => set({ [key]: v })} />
            </div>
          ))}
          <div>
            <Label htmlFor="radius">Alert radius (km)</Label>
            <Input
              id="radius"
              type="number"
              min={1}
              max={500}
              value={p.radius_km}
              onChange={(e) => set({ radius_km: Number(e.target.value) })}
              className="mt-1 w-32"
            />
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={locating}
              onClick={async () => {
                const pos = await locate();
                if (pos) set({ latitude: pos.lat, longitude: pos.lng });
              }}
            >
              {locating ? "Locating…" : p.latitude ? "Update my location" : "Set my location"}
            </Button>
            {p.latitude && p.longitude ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Set your location to get alerts within your chosen radius.
              </p>
            )}
          </div>
          <Button disabled={save.isPending} onClick={() => save.mutate(p)}>
            {save.isPending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[1.05rem] font-bold">Recent</h2>
        {notifications.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border border-border bg-card p-4 ${!n.read_at ? "border-accent" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{n.title}</p>
                  <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </div>
                {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
