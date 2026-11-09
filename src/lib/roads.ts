/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase legacy/review-schema compatibility seam. */
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
export async function findRoadCandidates(
  name: string,
  county?: string | null,
): Promise<RoadCandidate[]> {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const { data } = await (supabase
    .from("roads")
    .select("*")
    .ilike("name", `%${trimmed}%`)
    .limit(25) as any);
  const normalized = trimmed
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  let candidates = (data ?? []) as RoadCandidate[];
  try {
    const aliasQuery = await (supabase as any)
      .from("roads")
      .select("*")
      .contains("aliases", [trimmed])
      .limit(25);
    if (!aliasQuery.error)
      candidates = [...candidates, ...((aliasQuery.data ?? []) as RoadCandidate[])];
  } catch {
    /* aliases are an optional reviewed schema extension */
  }
  const unique = Array.from(
    new Map(candidates.map((candidate) => [candidate.id, candidate])).values(),
  );
  return unique
    .filter((candidate) => {
      if (!county) return true;
      const context = [candidate.county, ...(candidate.county_context ?? [])]
        .filter(Boolean)
        .map((value) => value!.toLocaleLowerCase());
      return context.length === 0 || context.includes(county.toLocaleLowerCase());
    })
    .sort((a, b) => {
      const aExact = [a.name, ...(a.aliases ?? [])].some(
        (value) =>
          value
            .toLocaleLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim() === normalized,
      );
      const bExact = [b.name, ...(b.aliases ?? [])].some(
        (value) =>
          value
            .toLocaleLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim() === normalized,
      );
      return Number(bExact) - Number(aExact) || a.name.localeCompare(b.name);
    });
}
/** Free-text road descriptions stay on content rows; this helper never creates roads. */
// Compatibility signature: findExistingRoad(name: string, county?: string | null)
export async function findExistingRoad(
  name: string,
  county?: string | null,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const candidates = await findRoadCandidates(trimmed, county);
  const normalized = trimmed
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const exact = candidates.filter((candidate) =>
    [candidate.name, ...(candidate.aliases ?? [])].some(
      (value) =>
        value
          .toLocaleLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim() === normalized,
    ),
  );
  const match = exact.length === 1 ? exact[0] : null;
  return match?.id ?? null;
}

export type RoadGeometryConfidence = "verified" | "approximate" | "proposed" | "point_only";
export type RoadGeometryValue = {
  type: "Point" | "LineString" | "MultiLineString" | "Feature" | "FeatureCollection";
  coordinates?: unknown;
  geometry?: unknown;
  features?: unknown;
};
export function slugifyRoadName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
export function parseRoadAliases(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
export function parseRoadGeometry(value: string): RoadGeometryValue | null {
  if (!value.trim()) return null;
  const parsed = JSON.parse(value) as RoadGeometryValue;
  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string")
    throw new Error("Road geometry must be a GeoJSON object.");
  if (
    !["Point", "LineString", "MultiLineString", "Feature", "FeatureCollection"].includes(
      parsed.type,
    )
  )
    throw new Error(
      "Road geometry must be a Point, LineString, MultiLineString, Feature or FeatureCollection.",
    );
  return parsed;
}
export function isSchemaCapabilityError(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  return /pgrst202|pgrst204|pgrst205|42p01|column .* does not exist|schema cache/i.test(
    `${value?.code ?? ""} ${value?.message ?? ""}`,
  );
}
export function publicRoadGeometryLabel(confidence?: string | null) {
  if (confidence === "verified") return "Verified route geometry";
  if (confidence === "approximate") return "Approximate location — not a verified road alignment";
  if (confidence === "proposed") return "Proposed alignment — pending verification";
  if (confidence === "point_only") return "Verified point location only";
  return "Geometry verification pending";
}
