import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
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

  const eligibleAds = ads.filter((candidate) => {
    const title = String(candidate.title ?? "")
      .trim()
      .toLowerCase();
    return !/^(emergency response, 24\/7|genuine parts, trusted fit)$/.test(title);
  });
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

  return (
    <div
      data-ad-placement={placement}
      className={`flex flex-wrap items-center justify-center gap-3 rounded-xl border border-accent/60 bg-brand-navy p-4 text-center text-white ${className}`}
    >
      <Megaphone className="size-6 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 basis-full">
        <p className="font-semibold uppercase tracking-wide text-white">YOUR AD HERE</p>
        <p className="mt-0.5 text-xs text-white/70">
          Reach Share Barabara’s road-safety community.
        </p>
      </div>
      <Link
        to="/partner-with-us"
        className="shrink-0 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
      >
        Advertise with us
      </Link>
    </div>
  );
}
