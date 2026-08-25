import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Every page carries at least one of these. With no active sponsor ad it
 * falls back to a house placeholder promoting Partner With Us, rather than
 * rendering nothing, since a promotional slot is a site-wide requirement.
 */
export function BannerAd({ className = "" }: { className?: string }) {
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
        className={`flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-accent ${className}`}
      >
        {ad.image_url ? (
          <img src={ad.image_url} alt={ad.title} className="h-12 w-auto rounded" />
        ) : (
          <Megaphone className="size-6 text-accent" />
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Advertisement{ad.advertiser ? ` · ${ad.advertiser}` : ""}
          </p>
          <p className="font-semibold">{ad.title}</p>
        </div>
      </a>
    );
  }

  return (
    <Link
      to="/partner-with-us"
      className={`flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-accent ${className}`}
    >
      <Megaphone className="size-6 text-accent" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Advertisement</p>
        <p className="font-semibold">Advertise your road safety business here</p>
      </div>
    </Link>
  );
}
