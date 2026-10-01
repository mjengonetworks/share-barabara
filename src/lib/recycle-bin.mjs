import { supabase } from "@/integrations/supabase/client";

export const RECYCLE_CONTENT_TYPES = [
  { value: "alert", label: "Alerts" },
  { value: "report", label: "Reports" },
  { value: "article", label: "Articles" },
  { value: "feed_post", label: "Feed posts" },
  { value: "comment", label: "Comments" },
  { value: "video", label: "Videos" },
  { value: "infrastructure_issue", label: "Infrastructure issues" },
  { value: "campaign", label: "Campaigns" },
];

export function recycleContentLabel(type) {
  return RECYCLE_CONTENT_TYPES.find((item) => item.value === type)?.label ?? type;
}

export async function moveToRecycleBin(contentType, contentId, reason = null) {
  const { data, error } = await supabase.rpc("recycle_bin_delete", {
    _content_type: contentType,
    _content_id: contentId,
    _reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function restoreRecycleBinItem(itemId) {
  const { data, error } = await supabase.rpc("recycle_bin_restore", { _item_id: itemId });
  if (error) throw error;
  return data;
}

export async function permanentlyDeleteRecycleBinItem(itemId) {
  const { data, error } = await supabase.rpc("recycle_bin_permanently_delete", { _item_id: itemId });
  if (error) throw error;
  return data;
}

export function isRecycleBinUnavailable(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /recycle_bin|schema cache|does not exist|could not find/i.test(message);
}
