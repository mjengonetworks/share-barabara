import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Uploads to the public "media" bucket under the current user's own folder
 *  (required by the storage RLS policies) and returns its public URL. */
export async function uploadMedia(file: File, userId: string): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > max) {
    throw new Error(`File too large (max ${Math.round(max / 1024 / 1024)}MB)`);
  }
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Older records may contain a media-bucket object path instead of the full
 * public URL returned by uploadMedia. Keep absolute and app-relative URLs
 * untouched; only resolve bare storage paths through the existing public
 * bucket configuration.
 */
export function mediaPublicUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^(https?:|data:|blob:|\/)/i.test(trimmed)) return trimmed;
  return supabase.storage.from("media").getPublicUrl(trimmed).data.publicUrl;
}
