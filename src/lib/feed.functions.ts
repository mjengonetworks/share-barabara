import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceAIRateLimit } from "@/lib/ai/rate-limit.server";
import { extractFeedHashtags, normalizeFeedBody } from "@/lib/feed.mjs";

type FeedSubmission = {
  body: string;
  media?: Array<{
    media_type: "image" | "video";
    storage_path: string;
    filename: string;
    mime_type: string;
    bytes: number;
  }>;
};

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
    if (data?.media && data.media.length > 4) throw new Error("Attach no more than four files");
    const mediaPaths = (data?.media ?? []).map((media) => media.storage_path);
    try {
      for (const media of data?.media ?? []) {
        if (media.media_type !== "image" && media.media_type !== "video") throw new Error("Unsupported media type");
        if (!media.storage_path.startsWith(`${context.userId}/`)) throw new Error("Media ownership could not be verified");
        if (media.bytes <= 0 || media.bytes > 50 * 1024 * 1024) throw new Error("Media file is too large");
        if (!media.filename || !media.mime_type) throw new Error("Media metadata is incomplete");
      }
      if (mediaPaths.length) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: objects, error: objectError } = await (supabaseAdmin.schema("storage").from("objects") as any)
          .select("name,bucket_id,owner_id,metadata")
          .eq("bucket_id", "feed-media")
          .in("name", mediaPaths);
        if (objectError) throw objectError;
        const objectMap = new Map((objects ?? []).map((object: { name: string; owner_id?: string; metadata?: { size?: number; mimetype?: string } }) => [object.name, object]));
        for (const media of data?.media ?? []) {
          const object = objectMap.get(media.storage_path);
          const actualSize = Number(object?.metadata?.size ?? 0);
          const actualMime = object?.metadata?.mimetype ?? "";
          if (!object || (object.owner_id && object.owner_id !== context.userId)) throw new Error("Media ownership could not be verified");
          if (actualSize <= 0 || actualSize > 50 * 1024 * 1024) throw new Error("Media file is too large");
          if ((media.media_type === "image" && !actualMime.startsWith("image/")) || (media.media_type === "video" && !actualMime.startsWith("video/"))) {
            throw new Error("Media type could not be verified");
          }
        }
      }
    } catch (error) {
      if (mediaPaths.length && mediaPaths.every((path) => path.startsWith(`${context.userId}/`))) {
        await context.supabase.storage.from("feed-media").remove(mediaPaths);
      }
      throw error;
    }

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
    let postId: string | null = null;
    try {
      const { data: post, error } = await (context.supabase.from("feed_posts") as any).insert({
        author_id: context.userId,
        body,
        hashtags: extractFeedHashtags(body),
        status,
        moderation_status: moderationStatus,
        moderation_reason: moderation.reason,
      }).select("id").single();
      if (error) throw error;
      postId = post.id;
      if (data?.media?.length) {
        const { error: mediaError } = await (context.supabase.from("feed_post_media") as any).insert(
          data.media.map((media) => ({ ...media, post_id: post.id, owner_id: context.userId })),
        );
        if (mediaError) throw mediaError;
      }
      return { id: post.id, status, moderationStatus };
    } catch (error) {
      if (mediaPaths.length) await context.supabase.storage.from("feed-media").remove(mediaPaths);
      if (postId) {
        await (context.supabase.from("feed_posts") as any)
          .delete()
          .eq("id", postId)
          .eq("author_id", context.userId)
          .eq("status", "pending");
      }
      throw error;
    }
  });
