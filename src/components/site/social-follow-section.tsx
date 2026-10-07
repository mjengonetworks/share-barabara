import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SocialIcon } from "@/components/site/social-icon";

const allowedPlatforms = new Set(["x", "facebook", "instagram", "tiktok", "youtube", "whatsapp"]);

function safeSocialUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["x.com", "twitter.com", "facebook.com", "instagram.com", "tiktok.com", "youtube.com", "whatsapp.com"].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
  } catch {
    return null;
  }
}

export function SocialFollowSection() {
  const { data: links = [] } = useQuery({
    queryKey: ["social-links", "media-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.from("social_links").select("id,label,icon_key,href,sort_order").eq("active", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((item) => allowedPlatforms.has(item.icon_key) && safeSocialUrl(item.href));
    },
    staleTime: 60_000,
  });

  return (
    <section className="rounded-xl border border-border bg-primary p-5 text-primary-foreground shadow-sm" aria-labelledby="follow-share-barabara">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent"><Users className="size-4" aria-hidden="true" /> Follow Share Barabara</p>
          <h2 id="follow-share-barabara" className="mt-1 text-xl font-bold">Stay connected with Share Barabara</h2>
          <p className="mt-1 text-sm text-primary-foreground/75">Follow configured official channels for road-safety conversations, reporting updates and public-interest media.</p>
        </div>
        {links.length ? <div className="flex flex-wrap gap-2" aria-label="Share Barabara social channels">
          {links.map((item) => <a key={item.id} href={safeSocialUrl(item.href) ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/20 px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:border-accent hover:text-accent" aria-label={`Follow Share Barabara on ${item.label}`}><SocialIcon iconKey={item.icon_key} className="size-4" />{item.label}<ExternalLink className="size-3" aria-hidden="true" /></a>)}
        </div> : <p className="rounded-md border border-primary-foreground/20 px-3 py-2 text-xs text-primary-foreground/70">Official channel links will appear here when configured.</p>}
      </div>
    </section>
  );
}

export const __socialFollowTest = { safeSocialUrl, allowedPlatforms };
