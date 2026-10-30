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

  // Alias-aware resolution is additive: old production schemas simply return
  // no alias rows, while the reviewed Road Registry can resolve known
  // spellings without creating a duplicate road record.
  const { data: candidates } = await (supabase
    .from("roads")
    .select("*")
    .ilike("name", `%${trimmed}%`)
    .limit(25) as any);
  const normalized = trimmed.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const match = (candidates ?? []).find((candidate: { id: string; name: string; aliases?: string[] | null }) => {
    const names = [candidate.name, ...(Array.isArray(candidate.aliases) ? candidate.aliases : [])];
    return names.some((value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized);
  });
  return match?.id ?? null;
}
