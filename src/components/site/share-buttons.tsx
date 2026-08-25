import { Facebook, Linkedin, Send, Star } from "lucide-react";

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

function TelegramLogo({ className }: { className?: string }) {
  return <Send className={className} />;
}

export function ShareButtons({ title }: { title: string }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", icon: XLogo, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "WhatsApp", icon: WhatsAppLogo, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Telegram", icon: TelegramLogo, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Share</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${l.label}`}
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent-foreground"
        >
          <l.icon className="size-4" />
        </a>
      ))}
      <a
        href="https://www.google.com/search?q=Share+Barabara+Kenya+road+safety"
        target="_blank"
        rel="noopener noreferrer"
        title="Search for Share Barabara on Google, then tap the star next to our name to follow us as a preferred source"
        className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent-foreground"
      >
        <Star className="size-3.5" /> Follow on Google
      </a>
    </div>
  );
}
