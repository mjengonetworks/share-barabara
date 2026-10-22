const ALLOWED_SOCIAL_HOSTS = [
  "x.com",
  "twitter.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "whatsapp.com",
] as const;

export const ALLOWED_SOCIAL_PLATFORMS = new Set([
  "x",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "whatsapp",
]);

export function safeSocialUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return ALLOWED_SOCIAL_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    )
      ? url.href
      : null;
  } catch {
    return null;
  }
}
