import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Every page carries at least one of these. With no active sponsor ad it
 * falls back to a house placeholder promoting Partner With Us, rather than
 * rendering nothing, since a promotional slot is a site-wide requirement.
 */
export function BannerAd({ className = "", placement = "site-default" }: { className?: string; placement?: string }) {
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

  const ad = ads.length > 0 ? ads[Math.floor(Math.random() * ads.length)] : null;

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
