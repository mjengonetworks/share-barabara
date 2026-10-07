import { createServerFn } from "@tanstack/react-start";

const MJENGO_ORIGIN = "https://mjengohub.co.ke";
const MEDIA_ORIGIN = "https://media.mjengohub.co.ke";
const MAX_ITEMS = 6;
const MAX_BODY = 700_000;
const CACHE_TTL = 5 * 60_000;

export type MjengoArticlePreview = {
  id: string;
  title: string;
  summary: string;
  category: string;
  publishedAt: string | null;
  imageUrl: string | null;
  canonicalUrl: string;
  author: string | null;
};

export type MjengoProjectPreview = {
  id: string;
  title: string;
  location: string | null;
  status: string | null;
  imageUrl: string | null;
  canonicalUrl: string;
};

export type MjengoMediaPreview = {
  id: string;
  title: string;
  imageUrl: string | null;
  canonicalUrl: string;
};

export type MjengoContent = {
  status: "ok" | "unavailable";
  articles: MjengoArticlePreview[];
  projects: MjengoProjectPreview[];
  media: MjengoMediaPreview[];
  fetchedAt: string | null;
};

const emptyContent = (): MjengoContent => ({ status: "unavailable", articles: [], projects: [], media: [], fetchedAt: null });
let cached: { expiresAt: number; value: MjengoContent } | null = null;

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function safeUrl(value: string | undefined, origins: string[]) {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value, MJENGO_ORIGIN);
    if (url.protocol !== "https:" || !origins.includes(url.origin)) return null;
    url.hash = "";
    return url.href;
  } catch { return null; }
}

function field(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function parseRss(xml: string): MjengoArticlePreview[] {
  const rows: MjengoArticlePreview[] = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const title = field(block, "title");
    const canonicalUrl = safeUrl(field(block, "link"), [MJENGO_ORIGIN]);
    if (!title || !canonicalUrl) continue;
    const image = block.match(/<(?:enclosure|media:content)[^>]+url=["']([^"']+)["']/i)?.[1];
    rows.push({
      id: canonicalUrl,
      title: title.slice(0, 220),
      summary: field(block, "description").slice(0, 420),
      category: field(block, "category").slice(0, 80) || "News & Articles",
      publishedAt: field(block, "pubDate") || null,
      imageUrl: safeUrl(image, [MEDIA_ORIGIN]),
      canonicalUrl,
      author: field(block, "dc:creator") || field(block, "author") || null,
    });
    if (rows.length >= MAX_ITEMS * 3) break;
  }
  return rows;
}

function parseProjects(html: string): MjengoProjectPreview[] {
  const rows: MjengoProjectPreview[] = [];
  for (const match of html.matchAll(/<a\s+href=["'](\/projects\/[^"']+)["']\s+class=["']ls-card["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const block = match[2];
    const path = match[1];
    const title = decodeHtml(block.match(/class=["']ls-card-title["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
    const canonicalUrl = safeUrl(path, [MJENGO_ORIGIN]);
    if (!title || !canonicalUrl) continue;
    const image = block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    const status = decodeHtml(block.match(/class=["']ls-card-pill["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "") || null;
    const location = decodeHtml(block.match(/📍\s*([^<]+)/i)?.[1] ?? "") || null;
    rows.push({ id: canonicalUrl, title: title.slice(0, 220), location: location?.slice(0, 100) ?? null, status: status?.slice(0, 60) ?? null, imageUrl: safeUrl(image, [MEDIA_ORIGIN]), canonicalUrl });
    if (rows.length >= MAX_ITEMS) break;
  }
  return rows;
}

function parseMedia(html: string): MjengoMediaPreview[] {
  const rows: MjengoMediaPreview[] = [];
  for (const match of html.matchAll(/<a\s+href=["'](https:\/\/www\.youtube\.com\/watch\?v=[^"']+)["'][^>]*class=["']mp-yt-card["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const block = match[2];
    const title = decodeHtml(block.match(/class=["']mp-yt-card-title["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "");
    const image = block.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
    if (!title) continue;
    rows.push({ id: match[1], title: title.slice(0, 220), imageUrl: safeUrl(image, ["https://i.ytimg.com"]), canonicalUrl: match[1] });
    if (rows.length >= MAX_ITEMS) break;
  }
  return rows;
}

async function fetchText(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${MJENGO_ORIGIN}${path}`, { signal: controller.signal, headers: { accept: "text/html, application/rss+xml" } });
    if (!response.ok) return "";
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_BODY) return "";
    const text = await response.text();
    return text.length <= MAX_BODY ? text : "";
  } catch { return ""; }
  finally { clearTimeout(timer); }
}

async function loadMjengoContent(): Promise<MjengoContent> {
  const [rss, projects, media] = await Promise.all([fetchText("/rss.xml"), fetchText("/projects"), fetchText("/media")]);
  const articles = parseRss(rss);
  const projectRows = parseProjects(projects);
  const mediaRows = parseMedia(media);
  if (!articles.length && !projectRows.length && !mediaRows.length) return emptyContent();
  return { status: "ok", articles, projects: projectRows, media: mediaRows, fetchedAt: new Date().toISOString() };
}

export const getMjengoContent = createServerFn({ method: "GET" }).handler(async () => {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await loadMjengoContent();
  cached = { expiresAt: Date.now() + CACHE_TTL, value };
  return value;
});

export const __mjengoTest = { decodeHtml, parseRss, parseProjects, parseMedia, safeUrl };
