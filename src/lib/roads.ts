import { supabase } from "@/integrations/supabase/client";

/** Road slugs are stable (no random suffix) since a road name is matched before it is ever created. */
function slugifyRoad(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Finds a road by (case-insensitive) name, or creates it. Powers automatic road tagging. */
export async function matchOrCreateRoad(name: string, county?: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing } = await supabase
    .from("roads")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("roads")
    .insert({ name: trimmed, slug: slugifyRoad(trimmed), county: county ?? null })
    .select("id")
    .single();
  if (error) {
    // Likely a race with a concurrent submission creating the same road name.
    const { data: retry } = await supabase
      .from("roads")
      .select("id")
      .ilike("name", trimmed)
      .maybeSingle();
    return retry?.id ?? null;
  }
  return created.id;
}
