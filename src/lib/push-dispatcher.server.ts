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
  const { data: jobs, error } = await (supabaseAdmin.rpc("claim_notification_delivery_jobs", { p_limit: boundedLimit }) as any);
  if (error) throw error;
  const results = [];
  for (const job of jobs ?? []) results.push(await dispatchOne(job));
  return results;
}

async function dispatchOne(job: { id: string; notification_id: string; attempts: number; channel?: string }) {
  if (job.channel !== "push") return finish(job, "cancelled", "unsupported_channel");
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
  const { data: acceptedAttempts } = await (supabaseAdmin.from("notification_delivery_attempts") as any)
    .select("subscription_id").eq("job_id", job.id).eq("status", "accepted");
  const acceptedIds = new Set((acceptedAttempts ?? [])
    .map((attempt: { subscription_id: string | null }) => attempt.subscription_id).filter(Boolean));
  if (!subscriptions?.length) return finish(job, acceptedIds.size ? "delivered" : "cancelled", acceptedIds.size ? null : "no_active_devices");

  let accepted = 0;
  let permanent = 0;
  let transient = 0;
  for (const subscription of subscriptions as (PushSubscriptionRecord & { id: string; failure_count?: number })[]) {
    if (acceptedIds.has(subscription.id)) { accepted += 1; continue; }
    try {
      const result = await sendWebPush(subscription, {
        title: notification.title,
        body: notification.body ?? undefined,
        url: safeInternalLink(notification.link),
        tag: `notification-${notification.id}`,
      });
      if (result.ok) {
        accepted += 1;
        await recordAttempt(job, subscription.id, "accepted", result.status);
        await (supabaseAdmin.from("push_subscriptions") as any).update({
          last_success_at: new Date().toISOString(), failure_count: 0, status: "active", updated_at: new Date().toISOString(),
        }).eq("id", subscription.id);
      } else {
        if (result.permanent) permanent += 1; else transient += 1;
        await recordAttempt(job, subscription.id, result.permanent ? "invalid" : "failed", result.status);
        await (supabaseAdmin.from("push_subscriptions") as any).update({
          last_failure_at: new Date().toISOString(), failure_count: (subscription.failure_count ?? 0) + 1,
          status: result.permanent ? "invalid" : "active", updated_at: new Date().toISOString(),
        }).eq("id", subscription.id);
      }
    } catch (error) {
      transient += 1;
      await recordAttempt(job, subscription.id, "failed", null, error instanceof Error ? error.message.slice(0, 160) : "push_error");
    }
  }

  if (transient === 0) return finish(job, accepted > 0 ? "delivered" : "failed", accepted ? null : "all_devices_rejected");
  if (job.attempts >= MAX_ATTEMPTS) return finish(job, accepted > 0 ? "delivered" : "failed", accepted ? null : "retry_limit");
  await (supabaseAdmin.from("notification_delivery_jobs") as any).update({
    status: "retrying", next_attempt_at: retryAt(job.attempts).toISOString(), last_error: "transient_push_failure", locked_at: null,
  }).eq("id", job.id).eq("status", "processing");
  return { jobId: job.id, status: "retrying", error: "transient_push_failure", permanent };
}

async function recordAttempt(job: { id: string; attempts: number }, subscriptionId: string, status: "accepted" | "failed" | "invalid", httpStatus: number | null, errorCode?: string) {
  const { error } = await (supabaseAdmin.from("notification_delivery_attempts") as any).upsert({
    job_id: job.id, subscription_id: subscriptionId, attempt_number: job.attempts, status,
    http_status: httpStatus, error_code: errorCode ?? null,
  }, { onConflict: "job_id,subscription_id,attempt_number" });
  if (error) throw error;
}

async function finish(job: { id: string }, status: string, error: string | null) {
  await (supabaseAdmin.from("notification_delivery_jobs") as any).update({
    status, completed_at: new Date().toISOString(), last_error: error, locked_at: null,
  }).eq("id", job.id).eq("status", "processing");
  return { jobId: job.id, status, error };
}
