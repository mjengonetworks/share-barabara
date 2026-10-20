import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Every page carries at least one of these. With no active sponsor ad it
 * falls back to a house placeholder promoting Partner With Us, rather than
 * rendering nothing, since a promotional slot is a site-wide requirement.
 */
export function BannerAd({
  className = "",
  placement = "site-default",
}: {
  className?: string;
  placement?: string;
}) {
  const { data: ads = [] } = useQuery({
    queryKey: ["banner-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banner_ads")
        .select("*")
        .eq("active", true)
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: fallback = DEFAULT_FALLBACK } = useQuery({
    queryKey: ["advertising-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advertising_settings_public")
        .select(
          "fallback_headline, fallback_supporting_text, fallback_destination_url, fallback_enabled",
        )
        .eq("id", 1)
        .maybeSingle();
      if (error || !data) return DEFAULT_FALLBACK;
      return { ...DEFAULT_FALLBACK, ...data };
    },
    staleTime: 60_000,
  });

  const eligibleAds = ads.filter(isGenuinePaidAd);
  const ad =
    eligibleAds.length > 0 ? eligibleAds[Math.floor(Math.random() * eligibleAds.length)] : null;

  if (ad) {
    return (
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-ad-placement={placement}
        className={`flex items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-navy p-4 text-white transition-colors hover:border-accent ${className}`}
      >
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} className="h-12 w-auto rounded" />
        ) : (
          <Megaphone className="size-6 text-accent" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Sponsored</p>
          <p className="font-semibold text-white">{ad.title}</p>
        </div>
        <span className="shrink-0 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">
          Visit Advertiser
        </span>
      </a>
    );
  }

  if (!fallback.fallback_enabled) return null;

  return (
    <div
      data-ad-placement={placement}
      className={`flex flex-wrap items-center justify-center gap-3 rounded-xl border border-accent/60 bg-brand-navy p-4 text-center text-white ${className}`}
    >
      <Megaphone className="size-6 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 basis-full">
        <p className="font-semibold uppercase tracking-wide text-white">
          {fallback.fallback_headline}
        </p>
        {fallback.fallback_supporting_text ? (
          <p className="mt-0.5 text-xs text-white/70">{fallback.fallback_supporting_text}</p>
        ) : null}
      </div>
      <a
        href={fallback.fallback_destination_url}
        target={fallback.fallback_destination_url.startsWith("http") ? "_blank" : undefined}
        rel={
          fallback.fallback_destination_url.startsWith("http") ? "noopener noreferrer" : undefined
        }
        className="shrink-0 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
      >
        Advertise with us
      </a>
    </div>
  );
}

const DEFAULT_FALLBACK = {
  fallback_headline: "Your Ad Here",
  fallback_supporting_text: "",
  fallback_destination_url: "/partner-with-us",
  fallback_enabled: true,
};

function isGenuinePaidAd(candidate: { is_demo?: boolean | null }) {
  return candidate.is_demo !== true;
}
