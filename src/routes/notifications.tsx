import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAlertSeverities } from "@/hooks/useTaxonomy";
import { useIncidentTaxonomy } from "@/hooks/useIncidentTaxonomy";
import { KENYA_COUNTIES } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ALERT_RADIUS_CHOICES_KM, isValidCoordinate, normalizeRadiusKm } from "@/lib/alert-notification.mjs";
import { activeTaxonomyRows, NOTIFICATION_CUSTOMIZATION_FIELDS, NOTIFICATION_CUSTOMIZATION_SELECT, normalizeNotificationPreferenceRow, preferenceSummary } from "@/lib/notification-preferences.mjs";
import { registerWebPushSubscription, removeWebPushSubscription, webPushConfigured } from "@/lib/web-push";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "Notification Settings: Share Barabara" },
    { name: "description", content: "Control your Share Barabara alert, community and account notifications." },
  ] }),
  component: NotificationsPage,
});

type Prefs = {
  articles: boolean; reports: boolean; alerts: boolean; interactions: boolean;
  notificationsEnabled: boolean; inAppEnabled: boolean; browserEnabled: boolean;
  emailEnabled: boolean; pushEnabled: boolean; communityEnabled: boolean; accountEnabled: boolean;
  radiusEnabled: boolean; radius_km: number; latitude: number | null; longitude: number | null;
  countyFilters: string[]; roadIds: string[]; hazardTypes: string[]; excludedHazards: string[];
  alertSeverities: string[]; muteUntil: string | null;
};

const DEFAULT_PREFS: Prefs = {
  articles: true, reports: true, alerts: true, interactions: true,
  notificationsEnabled: true, inAppEnabled: true, browserEnabled: true,
  emailEnabled: false, pushEnabled: false, communityEnabled: true, accountEnabled: true,
  radiusEnabled: false, radius_km: 20, latitude: null, longitude: null,
  countyFilters: [], roadIds: [], hazardTypes: [], excludedHazards: ["theft", "vandalism"],
  alertSeverities: [], muteUntil: null,
};

function localDateValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, markRead, markAllRead } = useNotifications();
  const queryClient = useQueryClient();
  const { locate, loading: locating } = useGeolocation();
  const { data: taxonomy = [] } = useIncidentTaxonomy();
  const { data: alertSeverityRows = [] } = useAlertSeverities();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [taxonomySearch, setTaxonomySearch] = useState("");
  const [roadSearch, setRoadSearch] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);

  const { data: advancedAvailable = false } = useQuery({
    queryKey: ["notification-customization-schema"],
    enabled: !!user,
    queryFn: async () => {
      const { error } = await (supabase.from("notification_preferences") as any)
        .select(NOTIFICATION_CUSTOMIZATION_SELECT).limit(1);
      return !error;
    },
    staleTime: 300_000,
  });

  const { data: roads = [] } = useQuery({
    queryKey: ["notification-road-options"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase.from("roads") as any).select("id,name,county").order("name").limit(250);
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; county?: string | null }[];
    },
    staleTime: 300_000,
  });

  useQuery({
    queryKey: ["notification-prefs", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_preferences").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      const row = normalizeNotificationPreferenceRow(data ?? {}, DEFAULT_PREFS) as Partial<Prefs>;
      const hasLocation = isValidCoordinate(row.latitude, row.longitude);
      const next: Prefs = {
        ...DEFAULT_PREFS, ...row,
        radius_km: normalizeRadiusKm(row.radius_km),
        latitude: hasLocation ? row.latitude! : null, longitude: hasLocation ? row.longitude! : null,
        countyFilters: Array.isArray(row.countyFilters) ? row.countyFilters : [],
        roadIds: Array.isArray(row.roadIds) ? row.roadIds : [], hazardTypes: Array.isArray(row.hazardTypes) ? row.hazardTypes : [],
        excludedHazards: Array.isArray(row.excludedHazards) ? row.excludedHazards : ["theft", "vandalism"],
        alertSeverities: Array.isArray(row.alertSeverities) ? row.alertSeverities : [],
        notificationsEnabled: row.notificationsEnabled ?? true,
        inAppEnabled: row.inAppEnabled ?? true,
        browserEnabled: row.browserEnabled ?? true,
        communityEnabled: row.communityEnabled ?? row.interactions ?? true,
        accountEnabled: row.accountEnabled ?? true,
        radiusEnabled: row.radiusEnabled ?? false,
        muteUntil: row.muteUntil ?? null,
      };
      setPrefs(next);
      return next;
    },
  });

  const save = useMutation({
    mutationFn: async (next: Prefs) => {
      if (!user) throw new Error("Sign in required");
      const hasLocation = isValidCoordinate(next.latitude, next.longitude);
      const base = {
        user_id: user.id, articles: next.articles, reports: next.reports, alerts: next.alerts,
        interactions: next.communityEnabled, radius_km: normalizeRadiusKm(next.radius_km),
        latitude: hasLocation ? next.latitude : null, longitude: hasLocation ? next.longitude : null,
      };
      const advanced = advancedAvailable ? {
        [NOTIFICATION_CUSTOMIZATION_FIELDS.notificationsEnabled]: next.notificationsEnabled,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.inAppEnabled]: next.inAppEnabled,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.browserEnabled]: next.browserEnabled,
        email_enabled: false, push_enabled: next.pushEnabled,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.communityEnabled]: next.communityEnabled,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.accountEnabled]: next.accountEnabled,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.radiusEnabled]: next.radiusEnabled && hasLocation,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.countyFilters]: next.countyFilters,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.roadIds]: next.roadIds,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.hazardTypes]: next.hazardTypes,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.excludedHazards]: next.excludedHazards,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.alertSeverities]: next.alertSeverities,
        [NOTIFICATION_CUSTOMIZATION_FIELDS.muteUntil]: next.muteUntil,
      } : {};
      const { error } = await (supabase.from("notification_preferences") as any).upsert({ ...base, ...advanced });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notification preferences saved"); queryClient.invalidateQueries({ queryKey: ["notification-prefs", user?.id] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user) return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="text-xl font-bold">Sign in to manage notifications</h1><Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button></div>;

  const p = prefs ?? DEFAULT_PREFS;
  const set = (patch: Partial<Prefs>) => setPrefs({ ...p, ...patch });
  const activeTaxonomy = activeTaxonomyRows(taxonomy);
  const visibleTaxonomy = activeTaxonomy.filter((row) => `${row.label} ${row.value} ${row.parent_value ?? ""}`.toLowerCase().includes(taxonomySearch.toLowerCase()));
  const filteredRoads = roads.filter((road) => `${road.name} ${road.county ?? ""}`.toLowerCase().includes(roadSearch.toLowerCase())).slice(0, 30);
  const summary = preferenceSummary(p, activeTaxonomy);
  const browserSupported = typeof window !== "undefined" && "Notification" in window;
  const pushConfigured = webPushConfigured();

  async function requestBrowserPermission() {
    if (!browserSupported) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") set({ browserEnabled: true }); else toast.message("Browser permission was not granted");
  }

  async function enablePush() {
    setPushBusy(true);
    try {
      const result = await registerWebPushSubscription(user.id);
        if (result.enabled) {
          setPushRegistered(true);
          set({ pushEnabled: true });
          save.mutate({ ...p, pushEnabled: true });
          toast.success("Background push is enabled for this device");
        }
      else toast.message("Background push is not available on this device yet");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not enable background push");
    } finally { setPushBusy(false); }
  }

  async function disablePush() {
    setPushBusy(true);
      try {
        await removeWebPushSubscription(user.id);
        setPushRegistered(false);
        set({ pushEnabled: false });
        save.mutate({ ...p, pushEnabled: false });
        toast.success("Background push removed for this device");
      }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not remove background push"); }
    finally { setPushBusy(false); }
  }

  return <div className="mx-auto max-w-4xl px-4 py-10">
    <p className="text-xs font-semibold uppercase tracking-widest text-accent-foreground">Profile · Settings</p>
    <h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><Bell className="size-8 text-accent" /> Notifications</h1>
    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Choose which public alerts matter to you and how this signed-in account should notify you. Your saved location is private and is never used as live tracking.</p>
    {!advancedAvailable ? <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">Basic preferences are available now. Advanced matching controls activate after the review-only notification customization migration is approved and applied.</div> : null}

    <section className="mt-6 rounded-lg border border-border bg-card p-5 card-elevated"><h2 className="text-lg font-bold">Notification groups</h2><div className="mt-4 space-y-4">
      <SettingRow id="notifications-enabled" label="All notifications" description="Master switch for server-created notifications."><Switch id="notifications-enabled" checked={p.notificationsEnabled} onCheckedChange={(v) => set({ notificationsEnabled: v })} /></SettingRow>
      <SettingRow id="alerts-enabled" label="Road-safety Alerts" description="Active/public alerts that match your location and content rules."><Switch id="alerts-enabled" checked={p.alerts} onCheckedChange={(v) => set({ alerts: v })} /></SettingRow>
      <SettingRow id="community-enabled" label="Community activity" description="Existing replies and upvotes involving your content."><Switch id="community-enabled" checked={p.communityEnabled} onCheckedChange={(v) => set({ communityEnabled: v, interactions: v })} /></SettingRow>
      <SettingRow id="account-enabled" label="Account activity" description="Status updates for your submitted articles and reports."><Switch id="account-enabled" checked={p.accountEnabled} onCheckedChange={(v) => set({ accountEnabled: v })} /></SettingRow>
    </div></section>

    <section className="mt-5 rounded-lg border border-border bg-card p-5 card-elevated"><h2 className="text-lg font-bold">Delivery channels</h2><div className="mt-4 space-y-4">
      <SettingRow id="in-app-enabled" label="In-app notifications" description="The notification list and unread badge."><Switch id="in-app-enabled" checked={p.inAppEnabled} onCheckedChange={(v) => set({ inAppEnabled: v })} /></SettingRow>
      <SettingRow id="browser-enabled" label="Browser notifications" description={browserSupported ? "Foreground notifications while this site is open and browser permission is granted." : "This browser does not expose the Notification API."}><Switch id="browser-enabled" checked={p.browserEnabled && browserSupported} disabled={!browserSupported} onCheckedChange={(v) => set({ browserEnabled: v })} /></SettingRow>
      {browserSupported && Notification.permission !== "granted" ? <Button type="button" variant="outline" size="sm" onClick={requestBrowserPermission}>Allow browser notifications</Button> : null}
      <SettingRow id="email-enabled" label="Email notifications" description="Not available yet; no email provider is configured."><Switch id="email-enabled" checked={false} disabled /></SettingRow>
      <SettingRow id="push-enabled" label="Background push notifications" description={pushConfigured ? "Enable this device for genuine background Web Push. Other devices on your account remain separate." : "Not activated yet; a VAPID public key and server dispatcher are still required; no service-worker push delivery is active yet."}><Switch id="push-enabled" checked={pushRegistered || p.pushEnabled} disabled={!pushConfigured || pushBusy} onCheckedChange={(v) => { if (v) void enablePush(); else void disablePush(); }} /></SettingRow>
      {pushConfigured ? <div className="flex gap-2"><Button type="button" variant="outline" size="sm" disabled={pushBusy} onClick={enablePush}>{pushBusy ? "Updating…" : "Register this device"}</Button><Button type="button" variant="ghost" size="sm" disabled={pushBusy} onClick={disablePush}>Remove this device</Button></div> : null}
    </div></section>

    <section className="mt-5 rounded-lg border border-border bg-card p-5 card-elevated"><h2 className="text-lg font-bold">Where alerts apply</h2><p className="mt-1 text-sm text-muted-foreground">Location rules are OR: a matching radius, county, or road is enough. Missing location never matches a radius.</p><div className="mt-4 space-y-5">
      <SettingRow id="radius-enabled" label="Alerts around my saved location" description="Explicit opt-in; this is a saved preference, not continuous tracking."><Switch id="radius-enabled" checked={p.radiusEnabled} disabled={!isValidCoordinate(p.latitude, p.longitude)} onCheckedChange={(v) => set({ radiusEnabled: v })} /></SettingRow>
      <div><Label htmlFor="radius">Radius (kilometres)</Label><select id="radius" value={p.radius_km} onChange={(e) => set({ radius_km: Number(e.target.value) })} className="mt-1 h-10 rounded-md border border-input bg-background px-3 text-sm">{ALERT_RADIUS_CHOICES_KM.map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></div>
      <div><Button type="button" variant="outline" size="sm" disabled={locating} onClick={async () => { const pos = await locate(); if (pos) set({ latitude: pos.lat, longitude: pos.lng, radiusEnabled: true }); }}>{locating ? "Locating…" : p.latitude ? "Update saved location" : "Set saved location"}</Button>{p.latitude !== null && p.longitude !== null ? <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={() => set({ latitude: null, longitude: null, radiusEnabled: false })}>Remove location</Button> : null}<p className="mt-1 text-xs text-muted-foreground">{p.latitude ? "A private saved location is set." : "You can use counties and roads without saving coordinates."}</p></div>
      <div><Label htmlFor="county-filter">Counties</Label><select id="county-filter" multiple value={p.countyFilters} onChange={(e) => set({ countyFilters: Array.from(e.target.selectedOptions, (option) => option.value) })} className="mt-1 min-h-28 w-full rounded-md border border-input bg-background p-2 text-sm">{KENYA_COUNTIES.map((county) => <option key={county} value={county}>{county}</option>)}</select></div>
      <div><Label htmlFor="road-search">Roads</Label><input id="road-search" value={roadSearch} onChange={(e) => setRoadSearch(e.target.value)} placeholder="Search roads" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />{roads.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No road directory is available yet; county-based alert locations remain supported.</p> : <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">{filteredRoads.map((road) => <label key={road.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.roadIds.includes(road.id)} onChange={(e) => set({ roadIds: e.target.checked ? [...p.roadIds, road.id] : p.roadIds.filter((id) => id !== road.id) })} />{road.name}{road.county ? <span className="text-xs text-muted-foreground">({road.county})</span> : null}</label>)}</div>}</div>
    </div></section>

    <section className="mt-5 rounded-lg border border-border bg-card p-5 card-elevated"><h2 className="text-lg font-bold">What alerts apply</h2><p className="mt-1 text-sm text-muted-foreground">Content rules are AND filters after a location match. A parent includes active descendants; selecting one subtype never selects its siblings. Exclusions always win.</p><div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" /><input aria-label="Search alert categories" value={taxonomySearch} onChange={(e) => setTaxonomySearch(e.target.value)} placeholder="Search alert categories" className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" /></div><div className="mt-3 space-y-2">{visibleTaxonomy.map((row) => <div key={row.value} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className={row.parent_value ? "pl-4 text-sm" : "font-medium"}>{row.parent_value ? "↳ " : ""}{row.label}</p><p className="pl-4 text-xs text-muted-foreground">{row.value}</p></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={p.hazardTypes.includes(row.value)} onChange={(e) => set({ hazardTypes: e.target.checked ? [...p.hazardTypes, row.value] : p.hazardTypes.filter((value) => value !== row.value) })} /> Include</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={p.excludedHazards.includes(row.value)} onChange={(e) => set({ excludedHazards: e.target.checked ? [...p.excludedHazards, row.value] : p.excludedHazards.filter((value) => value !== row.value) })} /> Exclude</label></div>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-sm font-medium">Severity</p>{alertSeverityRows.map((severity) => <label key={severity.value} className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={p.alertSeverities.includes(severity.value)} onChange={(e) => set({ alertSeverities: e.target.checked ? [...p.alertSeverities, severity.value] : p.alertSeverities.filter((value) => value !== severity.value) })} />{severity.label}</label>)}</div><div><Label htmlFor="mute-until">Mute alerts until</Label><input id="mute-until" type="datetime-local" value={localDateValue(p.muteUntil)} onChange={(e) => set({ muteUntil: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" /><p className="mt-1 text-xs text-muted-foreground">Only the selected alert group is muted; you can clear this at any time.</p></div></div></section>

    <section className="mt-5 rounded-lg border border-border bg-muted/30 p-5"><h2 className="text-lg font-bold">Active rule summary</h2><p className="mt-2 text-sm">{summary.alerts ? "Alerts enabled" : "Alerts disabled"}. {summary.location.length ? summary.location.join(" · ") : "No geographic rule selected"}.</p><p className="mt-1 text-sm text-muted-foreground">Including: {summary.includes.join(", ")}. {summary.excludes.length ? `Excluding: ${summary.excludes.join(", ")}.` : ""}</p></section>
    <Button className="mt-5" disabled={save.isPending} onClick={() => save.mutate(p)}>{save.isPending ? "Saving…" : "Save notification settings"}</Button>
    <section className="mt-10"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Recent notifications</h2>{notifications.some((n) => !n.read_at) ? <Button variant="ghost" size="sm" onClick={() => markAllRead()}>Mark all read</Button> : null}</div>{notifications.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Nothing yet.</p> : <ul className="mt-4 space-y-3">{notifications.map((n) => <li key={n.id} className={`rounded-lg border border-border bg-card p-4 ${!n.read_at ? "border-accent" : ""}`}><div className="flex items-center justify-between gap-3"><p className="font-semibold">{n.title}</p><span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span></div>{n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}{!n.read_at ? <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={() => markRead(n.id)}>Mark read</Button> : null}</li>)}</ul>}</section>
  </div>;
}

function SettingRow({ id, label, description, children }: { id: string; label: string; description: string; children: ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><Label htmlFor={id} className="font-medium">{label}</Label><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{children}</div>;
}
