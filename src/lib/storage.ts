import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Uploads to the public "media" bucket under the current user's own folder
 *  (required by the storage RLS policies) and returns its public URL. */
export async function uploadMedia(file: File, userId: string): Promise<string> {
  const asset = await uploadMediaAsset(file, userId);
  return asset.publicUrl;
}

export async function uploadMediaAsset(file: File, userId: string): Promise<{ publicUrl: string; storagePath: string }> {
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
  return { publicUrl: data.publicUrl, storagePath: path };
}

/** Uploads a Feed attachment to the dedicated private bucket. The returned
 * path is metadata only; callers must obtain a short-lived server-signed URL
 * before rendering the object. */
export async function uploadFeedMediaAsset(file: File, userId: string): Promise<{ storagePath: string }> {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) throw new Error("Only image and video attachments are allowed");
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0 || file.size > max) {
    throw new Error(`File too large (max ${Math.round(max / 1024 / 1024)}MB)`);
  }
  const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("feed-media").upload(storagePath, file, {
    cacheControl: "900",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return { storagePath };
}
