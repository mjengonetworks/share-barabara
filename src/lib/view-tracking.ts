import { supabase } from "@/integrations/supabase/client";

type ViewTable = "news_views" | "accident_report_views" | "alert_views";
type ViewColumn = "news_id" | "report_id" | "alert_id";

const memoryDedupe = new Set<string>();

/** Record at most one public view per entity per browser session. */
export async function recordPublicView(
  table: ViewTable,
  column: ViewColumn,
  id: string,
) {
  if (typeof window === "undefined" || !id) return;
  const key = `share-barabara:view:${table}:${id}`;
  try {
    if (window.sessionStorage.getItem(key) === "1" || memoryDedupe.has(key)) return;
  } catch {
    if (memoryDedupe.has(key)) return;
  }

  const { error } = await supabase.from(table).insert({ [column]: id } as never);
  if (error) return;
  memoryDedupe.add(key);
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Private browsing/storage-disabled sessions still retain module-local dedupe.
  }
}
