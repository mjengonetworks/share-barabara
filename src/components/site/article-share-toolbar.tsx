import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, Facebook, Linkedin, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_NEWS_SEARCH_URL =
  "https://news.google.com/search?q=share%20barabara&hl=en-ZA&gl=ZA&ceid=ZA%3Aen";
const GOOGLE_SOURCE_FALLBACK_URL =
  "https://www.google.com/preferences/source?q=sharebarabara.co.ke";

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

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.23a4.47 4.47 0 0 1-1.94 2.93v2.42h3.14c1.84-1.69 2.92-4.18 2.92-7.22Z"
      />
      <path
        fill="#34A853"
        d="M12 21.7c2.63 0 4.84-.87 6.45-2.35l-3.14-2.42c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.5A9.74 9.74 0 0 0 12 21.7Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.82A5.85 5.85 0 0 1 6.22 12c0-.63.11-1.25.31-1.82v-2.5H3.28A9.76 9.76 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.32l3.25-2.5Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.15c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.24 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.72 5.38l3.25 2.5C7.3 7.87 9.46 6.15 12 6.15Z"
      />
    </svg>
  );
}

function GoogleNewsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#4285f4" />
      <rect x="5" y="7" width="9" height="2" rx="1" fill="#fff" />
      <rect x="5" y="11" width="6" height="6" rx="1" fill="#34a853" />
      <rect x="13" y="11" width="6" height="2" rx="1" fill="#fbbc04" />
      <rect x="13" y="15" width="6" height="2" rx="1" fill="#ea4335" />
    </svg>
  );
}

type ShareButtonsProps = { title: string; canonicalUrl?: string };

export function PublicShareToolbar({ title, canonicalUrl }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const url = canonicalUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("google_source_label, google_source_url")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function positionMenu() {
      const trigger = menuRef.current?.querySelector("button");
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(304, window.innerWidth - 24);
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
      const openBelow = rect.bottom + 236 < window.innerHeight;
      setMenuStyle(
        openBelow
          ? { left, top: rect.bottom + 8, width, maxHeight: "calc(100dvh - 24px)" }
          : {
              left,
              bottom: window.innerHeight - rect.top + 8,
              width,
              maxHeight: "calc(100dvh - 24px)",
            },
      );
    }
    positionMenu();
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Article link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn’t copy the article link. You can copy it from the address bar.");
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const socialLinks = [
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "X",
      icon: XLogo,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      icon: WhatsAppLogo,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
  ];

  return (
    <div
      className="share-toolbar-actions grid w-full max-w-full min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1"
      aria-label="Public sharing actions"
    >
      <div className="relative min-w-0" ref={menuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 w-max max-w-full shrink-0 whitespace-nowrap items-center justify-center gap-1 rounded-md border border-brand-navy/70 bg-white px-1.5 text-[0.68rem] font-semibold leading-none text-brand-navy transition-colors hover:border-brand-blue hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2 sm:text-xs"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Share
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
        {open ? (
          <div
            role="menu"
            aria-label="Share article"
            style={menuStyle}
            className="fixed z-[60] grid min-w-0 gap-1 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-2xl"
          >
            {socialLinks.map(({ label, icon: Icon, href }) => (
              <a
                key={label}
                role="menuitem"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-4" aria-hidden="true" />
                Share on {label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy link"
        title="Copy link"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-navy/70 bg-white p-0 text-brand-navy transition-colors hover:border-brand-blue hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? (
          <Check className="size-4 text-safe" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        <span className="sr-only">{copied ? "Copied" : "Copy link"}</span>
      </button>
      <a
        href={settings?.google_source_url?.trim() || GOOGLE_SOURCE_FALLBACK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={settings?.google_source_label?.trim() || "Add as a preferred source on Google"}
        className="inline-flex h-8 min-w-0 max-w-full items-center justify-center gap-1 overflow-hidden rounded-md border border-slate-300 bg-white px-1 text-[0.58rem] font-semibold leading-[1.05] text-brand-navy transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-1.5 sm:text-[0.68rem]"
      >
        <GoogleLogo className="size-3.5 shrink-0 sm:size-4" />
        <span aria-hidden="true" className="min-w-0 text-left">
          <span className="block whitespace-nowrap">Add as a preferred</span>
          <span className="block whitespace-nowrap">source on Google</span>
        </span>
      </a>
      <a
        href={GOOGLE_NEWS_SEARCH_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow on Google News"
        className="inline-flex h-8 min-w-0 max-w-full items-center justify-center gap-1 overflow-hidden rounded-md border border-slate-300 bg-white px-1 text-[0.58rem] font-semibold leading-[1.05] text-brand-navy transition-colors hover:border-brand-blue hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-1.5 sm:text-[0.68rem]"
      >
        <GoogleNewsLogo className="size-3.5 shrink-0 sm:size-4" />
        <span aria-hidden="true" className="min-w-0 text-left">
          <span className="block whitespace-nowrap">Follow on Google</span>
          <span className="block whitespace-nowrap">News</span>
        </span>
      </a>
    </div>
  );
}

export const ArticleShareToolbar = PublicShareToolbar;

export { GOOGLE_NEWS_SEARCH_URL };
