export type AISurface = "header" | "content";

const INTERNAL_ORIGIN = "https://share-barabara.internal";

export function safeInternalReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return;
  if (value.includes("\\") || value.includes("\r") || value.includes("\n")) return;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || decoded.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(decoded)) return;
    const url = new URL(value, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return;
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return;
  }
}

export function aiReturnTo(surface: AISurface): string {
  if (typeof window === "undefined") return "/";
  const anchor = surface === "header" ? "header-share-barabara-ai" : "share-barabara-ai";
  return `${window.location.pathname}${window.location.search}#${anchor}`;
}

export function focusAISurface(anchor: string) {
  if (typeof window === "undefined" || window.location.hash !== `#${anchor}`) return;
  window.requestAnimationFrame(() => {
    const element = document.getElementById(anchor);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.querySelector<HTMLElement>("textarea,button,a")?.focus({ preventScroll: true });
  });
}
