import { supabase } from "@/integrations/supabase/client";

export function webPushConfigured() {
  return import.meta.env.VITE_WEB_PUSH_ENABLED === "true" && Boolean(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY)
    && typeof navigator !== "undefined" && "serviceWorker" in navigator
    && typeof window !== "undefined" && "PushManager" in window;
}

function decodeBase64Url(value: string) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function subscriptionRecord(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}

export async function registerWebPushSubscription(userId: string) {
  if (!webPushConfigured()) return { enabled: false, reason: "not_configured" as const };
  const registration = await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { enabled: false, reason: permission as "denied" | "default" };
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY),
  });
  const record = subscriptionRecord(subscription);
  if (!record.p256dh || !record.auth) throw new Error("The browser returned an incomplete push subscription.");
  const { error } = await (supabase.from("push_subscriptions") as any).upsert({
    user_id: userId,
    ...record,
    user_agent: navigator.userAgent.slice(0, 500),
    status: "active",
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) throw error;
  return { enabled: true, endpoint: record.endpoint };
}

export async function removeWebPushSubscription(userId: string) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await (supabase.from("push_subscriptions") as any).delete().eq("user_id", userId).eq("endpoint", endpoint);
}
