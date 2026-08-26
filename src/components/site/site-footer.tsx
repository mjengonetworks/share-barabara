import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Apple, BadgeCheck, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EMERGENCY_CONTACTS } from "@/lib/constants";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { SocialIcon } from "@/components/site/social-icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatuses } from "@/hooks/useSubscriptionStatuses";
import logoUrl from "@/assets/share-barabara-logo.png";

export function SiteFooter() {
  const { user } = useAuth();
  const { data: subStatus = {} } = useSubscriptionStatuses(user ? [user.id] : []);
  const alreadySubscribed = !!user && !!subStatus[user.id];

  const { data: socials = [] } = useQuery({
    queryKey: ["social-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_links")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  return (
    <footer className="mt-12 asphalt text-secondary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 border-b border-secondary/10 px-4 py-5">
        {socials.map((s) => (
          <a
            key={s.id}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow Share Barabara on ${s.label}`}
            className="flex size-9 items-center justify-center rounded-full border border-secondary/20 text-secondary/70 transition-colors hover:border-accent hover:text-accent"
          >
            <SocialIcon iconKey={s.icon_key} className="size-4" />
          </a>
        ))}
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <img
            src={logoUrl}
            alt="Share Barabara"
            className="h-14 w-auto [filter:drop-shadow(0_0_1px_rgba(255,255,255,0.9))_drop-shadow(0_0_3px_rgba(255,255,255,0.6))]"
          />
          <p className="mt-3 text-sm text-secondary/70">
            {settings?.footer_tagline ??
              "Share Barabara: promoting safer roads for all. News, hazard alerts, open crash statistics and reports from the community."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded border border-secondary/20 px-3 py-2 text-xs text-secondary/50">
              <Apple className="size-4" /> App Store: coming soon
            </span>
            <span className="flex items-center gap-2 rounded border border-secondary/20 px-3 py-2 text-xs text-secondary/50">
              <Smartphone className="size-4" /> Google Play: coming soon
            </span>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-accent">
            Newsletter
          </p>
          <NewsletterForm className="mt-3" />
          {!alreadySubscribed ? (
            <Button asChild size="sm" className="mt-5">
              <Link to="/subscribe">
                <BadgeCheck className="mr-1.5 size-4" /> Subscribe to Premium
              </Link>
            </Button>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-secondary/70">
            <li>
              <Link to="/news">News</Link>
            </li>
            <li>
              <Link to="/alerts">Alerts</Link>
            </li>
            <li>
              <Link to="/reports">Reports</Link>
            </li>
            <li>
              <Link to="/statistics">Statistics</Link>
            </li>
            <li>
              <Link to="/campaigns">Campaigns</Link>
            </li>
            <li>
              <Link to="/pages">Pages</Link>
            </li>
            <li>
              <Link to="/videos">Videos</Link>
            </li>
            <li>
              <Link to="/merch">Merch</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-secondary/70">
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/campaigns">Support Share Barabara</Link>
            </li>
            <li>
              <Link to="/partner-with-us">Partner with us</Link>
            </li>
            <li>
              <a href="https://mjengohub.co.ke" target="_blank" rel="noopener noreferrer">
                Mjengo Hub
              </a>
            </li>
            <li>
              <a href="https://mjengonetworks.co.ke" target="_blank" rel="noopener noreferrer">
                Mjengo Networks
              </a>
            </li>
            <li>
              <Link to="/privacy">Privacy policy</Link>
            </li>
            <li>
              <Link to="/terms">Terms of use</Link>
            </li>
            <li>
              <Link to="/sitemap">Site map</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-secondary/70">
            <li>
              <a href={`mailto:${settings?.contact_email ?? "info@sharebarabara.co.ke"}`}>
                {settings?.contact_email ?? "info@sharebarabara.co.ke"}
              </a>
            </li>
            <li>
              <a href={`tel:${(settings?.contact_phone ?? "0701 951 682").replace(/\s/g, "")}`}>
                {settings?.contact_phone ?? "0701 951 682"}
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-accent">
            Emergency numbers
          </p>
          <ul className="mt-3 space-y-1 text-sm text-secondary/70">
            {EMERGENCY_CONTACTS.slice(0, 2).map((c) => (
              <li key={c.name}>
                {c.name}: <span className="text-background">{c.number}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="hazard-stripe h-2" />
      <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-secondary/50">
        Community-sourced information. Always call 999 or 112 in an emergency. Statistics are
        indicative national figures for public awareness. Copyright Mjengo Networks 2026.
      </div>
    </footer>
  );
}
