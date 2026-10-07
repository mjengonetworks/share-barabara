import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type CommentInput = { entityType: "news" | "alert" | "report" | "feed_post"; entityId: string; body: string; parentId?: string | null; pageId?: string | null };

export const createComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: CommentInput; context: { supabase: any; userId: string } }) => {
    const body = String(data?.body ?? "").trim();
    if (body.length < 2 || body.length > 4000) throw new Error("Comments must be between 2 and 4,000 characters.");
    if (data.parentId) {
      const { data: parent, error } = await context.supabase.from("comments").select("entity_type,entity_id,moderation_status").eq("id", data.parentId).maybeSingle();
      if (error || !parent || parent.entity_type !== data.entityType || parent.entity_id !== data.entityId || parent.moderation_status === "removed") throw new Error("That discussion reply is no longer available.");
    }
    const { error } = await context.supabase.from("comments").insert({ entity_type: data.entityType, entity_id: data.entityId, body, user_id: context.userId, page_id: data.pageId ?? null, parent_comment_id: data.parentId ?? null });
    if (error) throw error;
    return { ok: true };
  });

export const reportComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: { commentId: string; reason: string }; context: { supabase: any; userId: string } }) => {
    const reason = String(data?.reason ?? "").trim();
    if (reason.length < 3 || reason.length > 1000) throw new Error("Add a short report reason.");
    const { data: existing, error: existingError } = await context.supabase.from("content_requests").select("id").eq("user_id", context.userId).eq("entity_type", "comment").eq("entity_id", data.commentId).eq("request_type", "report").in("status", ["pending", "open"]).limit(1);
    if (existingError) throw existingError;
    if (existing?.length) return { duplicate: true };
    const { error } = await context.supabase.from("content_requests").insert({ user_id: context.userId, entity_type: "comment", entity_id: data.commentId, request_type: "report", message: reason });
    if (error) throw error;
    return { duplicate: false };
  });
