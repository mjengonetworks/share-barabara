export const PRODUCTION_ORIGIN = "https://sharebarabara.co.ke";
export const FALLBACK_SOCIAL_IMAGE = `${PRODUCTION_ORIGIN}/icon-512.png`;

function absoluteUrl(value: string | null | undefined, fallback: string) {
  if (!value?.trim()) return fallback;
  try {
    const url = new URL(value, PRODUCTION_ORIGIN);
    return /^https?:$/.test(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function cleanDescription(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
}

export function canonicalUrl(pathname: string) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, PRODUCTION_ORIGIN).toString();
}

export function publicSocialImage(imageUrl?: string | null) {
  return absoluteUrl(imageUrl, FALLBACK_SOCIAL_IMAGE);
}

export function socialHead({
  title,
  description,
  pathname,
  imageUrl,
  type = "article",
}: {
  title: string;
  description: string;
  pathname: string;
  imageUrl?: string | null;
  type?: "article" | "website";
}) {
  const url = canonicalUrl(pathname);
  const image = publicSocialImage(imageUrl);
  const safeDescription = cleanDescription(description);
  return {
    meta: [
      { title: `${title}: Share Barabara` },
      { name: "description", content: safeDescription },
      { property: "og:title", content: title },
      { property: "og:description", content: safeDescription },
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:site_name", content: "Share Barabara" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: safeDescription },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
