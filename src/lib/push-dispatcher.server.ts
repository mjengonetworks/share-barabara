import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { matchesCustomAlertPreference } from "@/lib/notification-preferences.mjs";
import { retryAt, sendWebPush, type PushSubscriptionRecord } from "@/lib/push-dispatch.server";

const MAX_ATTEMPTS = 8;

function groupFor(type: string) {
  if (type === "nearby_alert") return "alerts";
  if (type === "upvote" || type === "comment_reply") return "community";
  if (type === "article_status" || type === "report_status") return "account";
  return null;
}

function safeInternalLink(link: string | null) {
  if (!link || !link.startsWith("/") || link.startsWith("//")) return "/notifications";
  return link;
}

function preferenceAllowsGroup(preference: Record<string, unknown>, group: string) {
  if (preference.notifications_enabled === false || preference.push_enabled !== true) return false;
  if (preference.mute_until && new Date(String(preference.mute_until)) > new Date()) return false;
  if (group === "alerts") return preference.alerts === true;
  if (group === "community") return preference.community_enabled !== false;
  return preference.account_enabled !== false;
}

export async function dispatchPendingPushJobs(limit = 25) {
  const boundedLimit = Math.min(Math.max(limit, 1), 100);
  const { data: jobs, error } = await (supabaseAdmin.from("notification_delivery_jobs") as any)
    .select("id,notification_id,attempts,status")
    .in("status", ["pending", "retrying"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(boundedLimit);
  if (error) throw error;

  const results = [];
  for (const job of jobs ?? []) results.push(await dispatchOne(job));
  return results;
}

async function dispatchOne(job: { id: string; notification_id: string; attempts: number; status: string }) {
  const claim = await (supabaseAdmin.from("notification_delivery_jobs") as any)
    .update({ status: "processing", locked_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
    .eq("id", job.id).in("status", ["pending", "retrying"]).select("id").maybeSingle();
  if (claim.error || !claim.data) return { jobId: job.id, status: "skipped" };

  const { data: notification, error: notificationError } = await (supabaseAdmin.from("notifications") as any)
    .select("id,user_id,type,title,body,link,source_type,source_id")
    .eq("id", job.notification_id).maybeSingle();
  if (notificationError || !notification) return finish(job, "cancelled", "notification_missing");
  const group = groupFor(notification.type);
  if (!group) return finish(job, "cancelled", "unsupported_event_group");

  const { data: preference } = await (supabaseAdmin.from("notification_preferences") as any)
    .select("*").eq("user_id", notification.user_id).maybeSingle();
  if (!preferenceAllowsGroup(preference ?? {}, group)) return finish(job, "cancelled", "preference_disabled");

  if (group === "alerts" && notification.source_id) {
    const [{ data: alert }, { data: taxonomy }] = await Promise.all([
      (supabaseAdmin.from("alerts") as any).select("status,latitude,longitude,county,road_id,hazard_type,severity").eq("id", notification.source_id).maybeSingle(),
      (supabaseAdmin.from("hazard_types") as any).select("value,parent_value,active"),
    ]);
    if (!alert || !matchesCustomAlertPreference(alert, preference, taxonomy ?? [], { channel: "push" })) return finish(job, "cancelled", "alert_preference_mismatch");
  }

  const { data: subscriptions, error: subscriptionError } = await (supabaseAdmin.from("push_subscriptions") as any)
    .select("id,endpoint,p256dh,auth,failure_count").eq("user_id", notification.user_id).eq("status", "active");
  if (subscriptionError) throw subscriptionError;
  if (!subscriptions?.length) return finish(job, "cancelled", "no_active_devices");

  let accepted = 0;
  let permanent = 0;
  for (const subscription of subscriptions as (PushSubscriptionRecord & { id: string })[]) {
    try {
      const result = await sendWebPush(subscription, { title: notification.title, body: notification.body ?? undefined, url: safeInternalLink(notification.link), tag: `notification-${notification.id}` });
      if (result.ok) {
        accepted += 1;
        await (supabaseAdmin.from("notification_delivery_attempts") as any).insert({ job_id: job.id, subscription_id: subscription.id, status: "accepted", http_status: result.status });
        await (supabaseAdmin.from("push_subscriptions") as any).update({ last_success_at: new Date().toISOString(), failure_count: 0, status: "active", updated_at: new Date().toISOString() }).eq("id", subscription.id);
      } else {
        permanent += result.permanent ? 1 : 0;
        await (supabaseAdmin.from("notification_delivery_attempts") as any).insert({ job_id: job.id, subscription_id: subscription.id, status: result.permanent ? "invalid" : "failed", http_status: result.status });
        await (supabaseAdmin.from("push_subscriptions") as any).update({ last_failure_at: new Date().toISOString(), failure_count: (subscription as any).failure_count ? (subscription as any).failure_count + 1 : 1, status: result.permanent ? "invalid" : "active", updated_at: new Date().toISOString() }).eq("id", subscription.id);
      }
    } catch (error) {
      await (supabaseAdmin.from("notification_delivery_attempts") as any).insert({ job_id: job.id, subscription_id: subscription.id, status: "failed", error_code: error instanceof Error ? error.message.slice(0, 160) : "push_error" });
    }
  }
  if (accepted > 0 || permanent === subscriptions.length) return finish(job, accepted > 0 ? "delivered" : "failed", accepted ? null : "all_devices_rejected");
  if (job.attempts + 1 >= MAX_ATTEMPTS) return finish(job, "failed", "retry_limit");
  return (supabaseAdmin.from("notification_delivery_jobs") as any).update({ status: "retrying", attempts: job.attempts + 1, next_attempt_at: retryAt(job.attempts + 1).toISOString(), last_error: "transient_push_failure" }).eq("id", job.id);
}

async function finish(job: { id: string }, status: string, error: string | null) {
  await (supabaseAdmin.from("notification_delivery_jobs") as any).update({ status, completed_at: new Date().toISOString(), last_error: error }).eq("id", job.id);
  return { jobId: job.id, status, error };
}
