export type PublicContextType = "article" | "alert" | "report" | "general";

export type Evidence = {
  id: string;
  kind: "article" | "alert" | "report" | "community";
  title: string;
  text: string;
  href?: string;
  sourceClass?: SourceClass;
  verificationState?: VerificationState;
  publishedAt?: string;
  retrievedAt?: string;
};

export type SourceClass = "official_authority" | "primary_source" | "reputable_secondary" | "other_credible" | "social_or_user_generated" | "unknown";
export type VerificationState = "verified" | "unverified" | "investigate" | "rejected";

export type TrustedCitation = {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  sourceId?: string;
  publishedAt?: string;
};

export type PublicAIResult = {
  ok: boolean;
  answer?: string;
  error?: "not_configured" | "provider_unavailable" | "provider_failed" | "insufficient_evidence" | "external_search_unavailable" | "external_search_failed" | "external_search_rate_limited" | "external_search_no_valid_results" | "external_sources_rejected" | "malformed_ai_response" | "invalid_request";
  provenance: "share_barabara" | "external" | "mixed" | "none";
  citations: TrustedCitation[];
  evidence: Evidence[];
  threadId?: string;
};
