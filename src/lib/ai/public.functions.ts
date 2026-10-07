import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicContextType, PublicAIResult } from "./types";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, clampText } from "./safe";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enforceAIRateLimit } from "./rate-limit.server";

type Input = {
  message: string;
  contextType?: PublicContextType;
  contextId?: string;
  threadId?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  sourceText?: string;
};
type AuthContext = { userId: string; supabase: SupabaseClient<Database> };

function validate(input: unknown): Input {
  if (!input || typeof input !== "object") throw new Error("Invalid AI request");
  const value = input as Record<string, unknown>;
  const message = clampText(value["message"], MAX_MESSAGE_LENGTH);
  if (!message) throw new Error("Message is required");
  const contextType =
    value["contextType"] === "article" ||
    value["contextType"] === "alert" ||
    value["contextType"] === "report" ||
    value["contextType"] === "general"
      ? value["contextType"]
      : "general";
  return {
    message,
    contextType,
    ...(typeof value["contextId"] === "string" ? { contextId: value["contextId"] } : {}),
    ...(typeof value["threadId"] === "string" ? { threadId: value["threadId"] } : {}),
    ...(typeof value["sourceText"] === "string" ? { sourceText: clampText(value["sourceText"], 12000) } : {}),
    history: Array.isArray(value["history"])
      ? value["history"]
          .slice(-MAX_HISTORY_MESSAGES)
          .filter(
            (item): item is { role: "user" | "assistant"; content: string } =>
              !!item &&
              typeof item === "object" &&
              ((item as Record<string, unknown>)["role"] === "user" ||
                (item as Record<string, unknown>)["role"] === "assistant") &&
              typeof (item as Record<string, unknown>)["content"] === "string",
          )
          .map((item) => ({ ...item, content: clampText(item.content, 3000) }))
      : [],
  };
}

async function runPublicAI(input: Input, userId?: string): Promise<PublicAIResult> {
  const { resolvePublicEvidence, assessLocalEvidence } = await import("./retrieval.server");
  const { searchExternal } = await import("./external.server");
  const { completeWithProvider } = await import("./providers.server");
  const evidence = await resolvePublicEvidence(
    input.contextType ?? "general",
    input.contextId,
    input.message,
  );
  let finalEvidence = evidence;
  // The article detail page already has the published body. This bounded
  // fallback keeps a useful article-grounded summary working when a public
  // row cannot be resolved by the server runtime, without claiming external
  // verification or trusting the text as instructions.
  if (!finalEvidence.length && input.sourceText && input.contextType !== "general") {
    finalEvidence = [{ id: input.contextId ?? "article-context", kind: input.contextType, title: input.message, text: input.sourceText }];
  }
  let externalCitations: PublicAIResult["citations"] = [];
  let provenance: PublicAIResult["provenance"] = "share_barabara";
  const localAssessment = assessLocalEvidence(input.message, evidence, input.contextType ?? "general");
  if (!localAssessment.sufficient) {
    try {
      await enforceAIRateLimit("external", userId);
    } catch {
      return { ok: false, error: "external_search_rate_limited", provenance: "none", citations: [], evidence };
    }
    const external = await searchExternal({ query: input.message, topic: "news", freshness: /\b(current|latest|today|breaking|recent|now)\b/i.test(input.message) ? "recent" : "any", maxResults: 5 });
    if (external.status !== "ok")
      return {
        ok: false,
        error: external.status,
        provenance: "none",
        citations: [],
        evidence,
      };
    finalEvidence = external.evidence;
    externalCitations = external.citations;
    provenance = "external";
  }
  const completion = await completeWithProvider("groq", {
    message: input.message,
    evidence: finalEvidence,
    ...(input.history ? { history: input.history } : {}),
    mode: "public",
  });
  if (!completion.ok)
    return {
      ok: false,
      error:
        completion.error === "not_configured"
          ? "not_configured"
          : completion.error === "malformed_ai_response"
            ? "malformed_ai_response"
            : "provider_failed",
      provenance: "none",
      citations: [],
      evidence: finalEvidence,
    };
  return {
    ok: true,
    answer: completion.answer,
    provenance,
    citations: externalCitations.filter((citation) => !completion.citationIds?.length || completion.citationIds.includes(citation.sourceId ?? "")),
    evidence: finalEvidence,
    ...(userId ? { threadId: input.threadId } : {}),
  };
}

export const quickAISummary = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: unknown }) => {
    const input = validate(data);
    await enforceAIRateLimit("summary");
    return runPublicAI({
      ...input,
      message: `Create a short, factual Quick AI Summary of this ${input.contextType}. Use about 80-110 words when the source supports that much, but be substantially shorter for short source content. Start with one-sentence synthesis, then include at most 3 high-value points only when useful. Prioritize the central development, key actors, implications, and essential dates or numbers. For alerts, prioritize what happened, affected road/location, current status, timing, and supported safety/diversion information. For reports, prioritize subject/event, location/date, key findings or impact, and verified actions or recommendations. Do not repeat the title or source, do not restate the full content, do not invent or infer facts, and do not add a heading, label, advice, or an unnecessary “Quick AI Summary” phrase.`,
    });
  },
);

export const publicAIChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: unknown; context: AuthContext }) => {
    let input = validate(data);
    const userId = context.userId;
    await enforceAIRateLimit("chat", userId);
    const db = context.supabase as SupabaseClient;
    let threadId = input.threadId;
    if (threadId) {
      const { data: thread } = await db
        .from("ai_chat_threads")
        .select("id,context_type,context_id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!thread) throw new Error("Chat thread not found");
      input = {
        ...input,
        contextType: thread.context_type as PublicContextType,
        ...(thread.context_id ? { contextId: thread.context_id } : { contextId: undefined }),
      };
    } else {
      const { data: thread, error } = await db
        .from("ai_chat_threads")
        .insert({
          user_id: userId,
          context_type: input.contextType ?? "general",
          context_id: input.contextId ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error("Unable to create chat thread");
      threadId = thread.id;
    }
    const { data: previous } = await db
      .from("ai_chat_messages")
      .select("role,content")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_MESSAGES);
    const result = await runPublicAI({
      ...input,
      ...(threadId ? { threadId } : {}),
      history: (previous ?? []).reverse(),
    });
    if (!result.ok || !result.answer) return { ...result, threadId };
    const userInsert = await db
      .from("ai_chat_messages")
      .insert({ thread_id: threadId, user_id: userId, role: "user", content: input.message });
    if (userInsert.error) throw new Error("Unable to save chat message");
    const assistantInsert = await db.from("ai_chat_messages").insert({
      thread_id: threadId,
      user_id: userId,
      role: "assistant",
      content: result.answer,
      citations: result.citations,
    });
    if (assistantInsert.error) throw new Error("Unable to save assistant response");
    await db
      .from("ai_chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("user_id", userId);
    return { ...result, threadId };
  });

export const listAIChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: AuthContext }) => {
    const { data, error } = await (context.supabase as SupabaseClient)
      .from("ai_chat_threads")
      .select("id,title,context_type,context_id,created_at,updated_at,archived_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Unable to load chats");
    return data ?? [];
  });

export const getAIChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: unknown; context: AuthContext }) => {
    const threadId = typeof data === "object" && data !== null && typeof (data as Record<string, unknown>).threadId === "string"
      ? (data as Record<string, unknown>).threadId as string
      : "";
    if (!threadId) throw new Error("Chat thread is required");
    const db = context.supabase as SupabaseClient;
    const { data: thread, error: threadError } = await db
      .from("ai_chat_threads")
      .select("id,title,context_type,context_id,created_at,updated_at")
      .eq("id", threadId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (threadError || !thread) throw new Error("Chat thread not found");
    const { data: messages, error: messageError } = await db
      .from("ai_chat_messages")
      .select("id,role,content,citations,created_at")
      .eq("thread_id", threadId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY_MESSAGES * 2);
    if (messageError) throw new Error("Unable to load chat messages");
    return { thread, messages: messages ?? [] };
  });
