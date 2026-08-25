import { Link } from "@tanstack/react-router";
import { Apple, Facebook, Instagram, Send, Smartphone, Youtube } from "lucide-react";
import { EMERGENCY_CONTACTS } from "@/lib/constants";
import { NewsletterForm } from "@/components/site/newsletter-form";
import logoUrl from "@/assets/share-barabara-logo.png";

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.9C21.96 6.45 17.5 2 12.04 2zm5.8 14.1c-.25.7-1.45 1.34-2 1.42-.51.08-1.16.11-1.87-.12-.43-.14-.98-.32-1.7-.63-2.98-1.29-4.93-4.28-5.08-4.48-.15-.2-1.22-1.62-1.22-3.1s.78-2.2 1.05-2.5c.28-.3.6-.38.8-.38.2 0 .4 0 .58.01.19.01.44-.07.68.53.25.6.85 2.08.92 2.23.08.15.13.33.02.53-.1.2-.16.33-.31.5-.15.18-.32.4-.46.54-.15.15-.3.31-.13.61.16.3.73 1.2 1.57 1.95 1.08.96 1.99 1.26 2.29 1.4.3.15.47.13.65-.08.18-.2.76-.89.96-1.19.2-.3.4-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.23.58.35.08.13.08.75-.17 1.45z" />
    </svg>
  );
}

const SOCIALS = [
  {
    label: "WhatsApp",
    icon: WhatsAppLogo,
    href: "https://whatsapp.com/channel/0029VbDqTJ4DzgTBbXMtC13J",
  },
  { label: "Telegram", icon: Send, href: "https://t.me/+XLH1nWU-LYk4M2Q0" },
  { label: "Facebook", icon: Facebook, href: "https://facebook.com/sharebaraba" },
  { label: "X", icon: XLogo, href: "https://x.com/sharebaraba" },
  { label: "Instagram", icon: Instagram, href: "https://instagram.com/sharebaraba" },
  { label: "YouTube", icon: Youtube, href: "https://youtube.com/@sharebaraba" },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 asphalt text-secondary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 border-b border-secondary/10 px-4 py-5">
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow Share Barabara on ${s.label}`}
            className="flex size-9 items-center justify-center rounded-full border border-secondary/20 text-secondary/70 transition-colors hover:border-accent hover:text-accent"
          >
            <s.icon className="size-4" />
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
            Share Barabara: promoting safer roads for all. News, hazard alerts, open crash
            statistics and reports from the community.
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
              <a href="mailto:info@sharebarabara.co.ke">info@sharebarabara.co.ke</a>
            </li>
            <li>
              <a href="tel:+254701951682">0701 951 682</a>
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
