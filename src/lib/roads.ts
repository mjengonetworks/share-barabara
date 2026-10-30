import { supabase } from "@/integrations/supabase/client";

export type RoadCandidate = {
  id: string;
  name: string;
  slug: string;
  county?: string | null;
  country_code?: string | null;
  aliases?: string[] | null;
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
  return ((data ?? []) as RoadCandidate[])
    .filter((candidate) => !county || !candidate.county || candidate.county.toLocaleLowerCase() === county.toLocaleLowerCase())
    .sort((a, b) => {
      const aExact = [a.name, ...(a.aliases ?? [])].some((value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized);
      const bExact = [b.name, ...(b.aliases ?? [])].some((value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized);
      return Number(bExact) - Number(aExact) || a.name.localeCompare(b.name);
    });
}

/** Finds an existing canonical road by name. Free-text road descriptions stay
 * on the content row; contributor input must not silently create taxonomy-like
 * road records or broaden Task 27 road subscriptions. */
export async function findExistingRoad(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const candidates = await findRoadCandidates(trimmed);
  const normalized = trimmed.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const exact = candidates.filter((candidate) => [candidate.name, ...(candidate.aliases ?? [])]
    .some((value) => value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normalized));
  const match = exact.length === 1 ? exact[0] : null;
  return match?.id ?? null;
}
