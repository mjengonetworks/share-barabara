import { supabase } from "@/integrations/supabase/client";

export type RoadCandidate = {
  id: string;
  name: string;
  slug: string;
  county?: string | null;
  country_code?: string | null;
  aliases?: string[] | null;
  county_context?: string[] | null;
};

export async function findRoadCandidates(name: string, county?: string | null): Promise<RoadCandidate[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const { data } = await (supabase
    .from("roads")
    .select("*")
    .ilike("name", `%${trimmed}%`)
    .limit(25) as any);
  const normalized = trimmed.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  let candidates = ((data ?? []) as RoadCandidate[]);
  // Alias matching is additive and fails closed on older schemas where the
  // reviewed aliases column is not present yet.
  try {
    const aliasQuery = await (supabase as any).from("roads").select("*").contains("aliases", [trimmed]).limit(25);
    if (!aliasQuery.error) candidates = [...candidates, ...((aliasQuery.data ?? []) as RoadCandidate[])];
  } catch {
    // Name matching remains available during the pre-migration compatibility window.
  }
  const unique = Array.from(new Map(candidates.map((candidate) => [candidate.id, candidate])).values());
  return unique
    .filter((candidate) => {
      if (!county) return true;
      const context = [candidate.county, ...(candidate.county_context ?? [])].filter(Boolean).map((value) => value!.toLocaleLowerCase());
      return context.length === 0 || context.includes(county.toLocaleLowerCase());
    })
    .sort((a, b) => {
      const aExact = [a.name, ...(a.aliases ?? [])].some((value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized);
      const bExact = [b.name, ...(b.aliases ?? [])].some((value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized);
      return Number(bExact) - Number(aExact) || a.name.localeCompare(b.name);
    });
}

/** Finds an existing canonical road by name. Free-text road descriptions stay
 * on the content row; contributor input must not silently create taxonomy-like
 * road records or broaden Task 27 road subscriptions. */
export async function findExistingRoad(name: string, county?: string | null): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const candidates = await findRoadCandidates(trimmed, county);
  const normalized = trimmed.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const exact = candidates.filter((candidate) => [candidate.name, ...(candidate.aliases ?? [])]
    .some((value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized));
  const match = exact.length === 1 ? exact[0] : null;
  return match?.id ?? null;
}
