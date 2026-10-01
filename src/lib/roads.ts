import { supabase } from "@/integrations/supabase/client";

/** Finds an existing canonical road by name. Free-text road descriptions stay
 * on the content row; contributor input must not silently create taxonomy-like
 * road records or broaden Task 27 road subscriptions. */
export async function findExistingRoad(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing } = await supabase
    .from("roads")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return existing.id;

  return existing?.id ?? null;
}
