import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serverEnv } from "@/lib/runtime-env.server";

const roleRank: Record<string, number> = { member: 0, guest_author: 1, author: 2, moderator: 3, editor: 4, admin: 5 };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export const sendNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: { subject?: string; body?: string }; context: { supabase: any; userId: string } }) => {
    const subject = data?.subject?.trim() ?? "";
    const body = data?.body?.trim() ?? "";
    if (subject.length < 2 || subject.length > 100) throw new Error("Enter a subject between 2 and 100 characters.");
    if (body.length < 2 || body.length > 5000) throw new Error("Enter a message between 2 and 5,000 characters.");

    const { data: roles, error: rolesError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (rolesError) throw rolesError;
    if (!(roles ?? []).some((item: { role: string }) => (roleRank[item.role] ?? 0) >= roleRank.editor)) throw new Error("Newsletter sending requires an editor role.");

    const apiKey = serverEnv("RESEND_API_KEY");
    const from = serverEnv("RESEND_FROM_EMAIL");
    if (!apiKey || !from) throw new Error("Newsletter delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL to the server runtime.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subscribers, error: subscriberError } = await supabaseAdmin.from("newsletter_subscribers").select("email").eq("active", true);
    if (subscriberError) throw subscriberError;
    const recipients = (subscribers ?? []).map((item: { email: string }) => item.email).filter((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (!recipients.length) throw new Error("There are no active newsletter subscribers.");

    const text = body;
    const html = body.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`).join("");
    for (let offset = 0; offset < recipients.length; offset += 100) {
      const batch = recipients.slice(offset, offset + 100).map((to) => ({ from, to: [to], subject, text, html }));
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (!response.ok) throw new Error(`Newsletter provider rejected delivery (HTTP ${response.status}).`);
    }

    const { error: logError } = await supabaseAdmin.from("newsletter_broadcasts").insert({ subject, body, recipient_count: recipients.length, sent_by: context.userId });
    if (logError) throw logError;
    return { recipientCount: recipients.length };
  });
