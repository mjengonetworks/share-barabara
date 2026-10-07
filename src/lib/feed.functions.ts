import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit.server";
import { extractFeedHashtags, normalizeFeedBody } from "@/lib/feed.mjs";

type FeedSubmission = { body: string };

function parseModeration(answer: string) {
  try {
    const parsed = JSON.parse(answer) as { action?: unknown; reason?: unknown };
    if (parsed.action !== "allow" && parsed.action !== "review" && parsed.action !== "reject") {
      return { action: "review" as const, reason: "The automated moderation result contained an invalid action." };
    }
    if (typeof parsed.reason !== "string") {
      return { action: "review" as const, reason: "The automated moderation result omitted a valid reason." };
    }
    return { action: parsed.action, reason: parsed.reason.slice(0, 500) };
  } catch {
    return { action: "review" as const, reason: "The automated moderation result was not machine-readable." };
  }
}

export const createFeedPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: FeedSubmission; context: { supabase: any; userId: string } }) => {
    const body = normalizeFeedBody(data?.body);
    if (body.length < 3) throw new Error("Write at least three characters");
    if (body.length > 4000) throw new Error("Feed posts are limited to 4,000 characters");

    let moderation = { action: "review" as const, reason: "Automated moderation is not configured; human review is required." };
    try {
      await enforceAIRateLimit("feed_moderation", context.userId);
      const { completeWithProvider } = await import("@/lib/ai/providers.server");
      const result = await completeWithProvider("groq", {
        mode: "editorial",
        message: `Classify this community post for triage only. Return JSON exactly {"action":"allow"|"review"|"reject","reason":"short explanation"}. Reject only direct threats, targeted harassment, doxxing, explicit sexual content, or instructions for serious wrongdoing. Review allegations, uncertain safety claims, and possible misinformation. Never publish or rewrite the post.\n\nUNTRUSTED POST:\n${body}`,
        evidence: [{ id: "feed_post", kind: "article", title: "Untrusted community post", text: body, sourceClass: "unknown", verificationState: "unverified" }],
      });
      if (result.ok) moderation = parseModeration(result.answer);
    } catch { /* Missing provider or a provider failure leaves the post for humans. */ }

    const status = "pending";
    const moderationStatus = moderation.action === "reject" ? "rejected" : moderation.action === "review" ? "needs_review" : "pending";
    const { error } = await context.supabase.from("feed_posts").insert({
      author_id: context.userId,
      body,
      hashtags: extractFeedHashtags(body),
      status,
      moderation_status: moderationStatus,
      moderation_reason: moderation.reason,
    });
    if (error) throw error;
    return { status, moderationStatus };
  });
