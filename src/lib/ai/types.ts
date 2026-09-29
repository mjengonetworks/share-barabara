export type PublicContextType = "article" | "alert" | "report" | "general";

export type Evidence = {
  id: string;
  kind: "article" | "alert" | "report";
  title: string;
  text: string;
  href?: string;
};

export type TrustedCitation = {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
};

export type PublicAIResult = {
  ok: boolean;
  answer?: string;
  error?: "not_configured" | "provider_unavailable" | "insufficient_evidence" | "invalid_request";
  provenance: "share_barabara" | "external" | "mixed" | "none";
  citations: TrustedCitation[];
  evidence: Evidence[];
  threadId?: string;
};
