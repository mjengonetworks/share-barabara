import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function isPlacementSchemaMissing(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .*placement|column .*starts_at|column .*ends_at|column .*priority/i.test(
      error.message ?? "",
    )
  );
}

/**
 * Every page carries at least one of these. With no active sponsor ad it
 * falls back to a house placeholder promoting Partner With Us, rather than
 * rendering nothing, since a promotional slot is a site-wide requirement.
 */
export function BannerAd({ className = "", placement = "site-default" }: { className?: string; placement?: string }) {
  const { data: ads = [] } = useQuery({
    queryKey: ["banner-ads", placement],
    queryFn: async () => {
      const placementQuery = await supabase
        .from("banner_ads")
        .select("*")
        .eq("active", true)
        .in("placement", [placement, "site-default"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      // The additive placement migration is intentionally deployable separately.
      // Until it is applied, keep the existing active-ad behavior as a safe fallback.
      if (placementQuery.error) {
        if (!isPlacementSchemaMissing(placementQuery.error)) throw placementQuery.error;
        const legacy = await supabase
          .from("banner_ads")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(10);
        if (legacy.error) throw legacy.error;
        return legacy.data;
      }

      const now = Date.now();
      return placementQuery.data
        .filter((ad) => {
          const startsAt = ad.starts_at ? Date.parse(ad.starts_at) : Number.NEGATIVE_INFINITY;
          const endsAt = ad.ends_at ? Date.parse(ad.ends_at) : Number.POSITIVE_INFINITY;
          return startsAt <= now && endsAt >= now;
        })
        .sort((a, b) => {
          const aExact = a.placement === placement ? 1 : 0;
          const bExact = b.placement === placement ? 1 : 0;
          return bExact - aExact;
        });
    },
    staleTime: 60_000,
  });

  const isSafeDestination = (url: string) => /^https?:\/\//i.test(url);
  const eligibleAds = ads.filter((ad) => isSafeDestination(ad.link_url));
  const ad = eligibleAds.length > 0 ? eligibleAds[0] : null;

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
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            Sponsored
          </p>
          <p className="font-semibold text-white">{ad.title}</p>
        </div>
        <span className="shrink-0 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">Visit Advertiser</span>
      </a>
    );
  }

  return (
    <div data-ad-placement={placement} className={`flex flex-wrap items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-navy p-4 text-white ${className}`}>
      <Megaphone className="size-6 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold tracking-wide text-white">Your Ad Here</p>
        <p className="mt-0.5 text-xs text-white/70">Reach road users and the wider transport community.</p>
      </div>
      <Link to="/partner-with-us" className="shrink-0 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy">Visit Advertiser</Link>
    </div>
  );
}
