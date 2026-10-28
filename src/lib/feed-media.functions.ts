import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

const SIGNED_URL_SECONDS = 15 * 60;

type FeedMediaRow = {
  id: string;
  post_id: string;
  storage_path: string;
  media_type: "image" | "video";
  filename: string;
};

async function optionalUserId(admin: any): Promise<string | null> {
  const token = getRequest()?.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

export const getFeedMediaSignedUrls = createServerFn({ method: "POST" }).handler(
  async ({ data }: { data: { mediaIds: string[] } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const mediaIds = Array.from(new Set((data?.mediaIds ?? []).filter((id) => typeof id === "string"))).slice(0, 40);
    if (!mediaIds.length) return {};

    const userId = await optionalUserId(supabaseAdmin);
    const [{ data: media, error: mediaError }, { data: roles }] = await Promise.all([
      (supabaseAdmin.from("feed_post_media") as any)
        .select("id,post_id,storage_path,media_type,filename")
        .in("id", mediaIds),
      userId
        ? (supabaseAdmin.from("user_roles") as any).select("role").eq("user_id", userId)
        : Promise.resolve({ data: [] }),
    ]);
    if (mediaError) throw mediaError;

    const rows = (media ?? []) as FeedMediaRow[];
    const postIds = Array.from(new Set(rows.map((row) => row.post_id)));
    const { data: posts, error: postError } = await (supabaseAdmin.from("feed_posts") as any)
      .select("id,author_id,status")
      .in("id", postIds);
    if (postError) throw postError;

    const moderator = (roles ?? []).some((role: { role?: string }) =>
      role.role === "moderator" || role.role === "editor" || role.role === "admin",
    );
    const postMap = new Map((posts ?? []).map((post: { id: string; author_id: string; status: string }) => [post.id, post]));
    const allowed = rows.filter((row) => {
      const post = postMap.get(row.post_id);
      return Boolean(post && (post.status === "published" || post.author_id === userId || moderator));
    });

    const signed = await Promise.all(
      allowed.map(async (row) => {
        const { data: url, error } = await supabaseAdmin.storage
          .from("feed-media")
          .createSignedUrl(row.storage_path, SIGNED_URL_SECONDS);
        if (error || !url?.signedUrl) return null;
        return [row.id, { signed_url: url.signedUrl }] as const;
      }),
    );
    return Object.fromEntries(signed.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
  },
);

