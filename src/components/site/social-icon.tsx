import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Send,
  Globe,
  Youtube,
  type LucideIcon,
} from "lucide-react";

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

function TikTokLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-1-.98-1.56-2.3-1.56-3.68h-3.15v13.3c0 1.6-1.3 2.9-2.9 2.9a2.9 2.9 0 0 1 0-5.8c.28 0 .55.04.8.12V9.4a6.06 6.06 0 0 0-.8-.05 6.06 6.06 0 0 0 0 12.12A6.06 6.06 0 0 0 14.9 15.4V9.02a7.13 7.13 0 0 0 4.16 1.33V7.2c-.9 0-1.75-.5-2.46-1.38z" />
    </svg>
  );
}

/** Maps a social_links.icon_key value to its icon component. Add a case here
 *  (and the matching value in the icon_key CHECK constraint) to support a
 *  new platform. */
export const SOCIAL_ICONS: Record<string, LucideIcon | typeof XLogo> = {
  whatsapp: WhatsAppLogo,
  telegram: Send,
  facebook: Facebook,
  x: XLogo,
  instagram: Instagram,
  youtube: Youtube,
  tiktok: TikTokLogo,
  linkedin: Linkedin,
  email: Mail,
  website: Globe,
};

export const SOCIAL_ICON_OPTIONS = Object.keys(SOCIAL_ICONS);

export function SocialIcon({ iconKey, className = "" }: { iconKey: string; className?: string }) {
  const Icon = SOCIAL_ICONS[iconKey] ?? Globe;
  return <Icon className={className} />;
}
