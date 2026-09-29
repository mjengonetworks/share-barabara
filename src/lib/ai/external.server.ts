import type { Evidence, TrustedCitation } from "./types";

export type ExternalSearchResult = {
  configured: boolean;
  evidence: Evidence[];
  citations: TrustedCitation[];
};

/** Provider-neutral seam for web retrieval. Deliberately fail-closed until an
 * approved external search provider and credential are configured. */
export async function searchExternal(_query: string): Promise<ExternalSearchResult> {
  return { configured: false, evidence: [], citations: [] };
}
