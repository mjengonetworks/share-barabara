import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://sharebarabara.co.ke";
const FEED_ITEM_LIMIT = 50;

type FeedItem = {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate: Date;
  imageUrl: string | null;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function imageMimeType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    default:
      return "image/jpeg";
  }
}

async function fetchNewsItems(): Promise<FeedItem[]> {
  try {
    const { data, error } = await supabase
      .from("news")
      .select("slug, title, summary, image_url, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(FEED_ITEM_LIMIT);
    if (error) throw error;

    return (data ?? []).map((n) => {
      const link = `${SITE_URL}/news/${n.slug}`;
      return {
        title: n.title,
        link,
        guid: link,
        description: n.summary,
        pubDate: new Date(n.published_at),
        imageUrl: n.image_url ? absoluteUrl(n.image_url) : null,
      };
    });
  } catch (error) {
    console.error("[rss-feed] failed to fetch news items", error);
    return [];
  }
}

async function fetchReportItems(): Promise<FeedItem[]> {
  try {
    const { data, error } = await supabase
      .from("accident_reports")
      .select("id, title, description, image_url, occurred_at")
      .eq("status", "approved")
      .order("occurred_at", { ascending: false })
      .limit(FEED_ITEM_LIMIT);
    if (error) throw error;

    return (data ?? []).map((r) => {
      const link = `${SITE_URL}/reports/${r.id}`;
      return {
        title: r.title,
        link,
        guid: link,
        description: r.description,
        pubDate: new Date(r.occurred_at),
        imageUrl: r.image_url ? absoluteUrl(r.image_url) : null,
      };
    });
  } catch (error) {
    console.error("[rss-feed] failed to fetch accident report items", error);
    return [];
  }
}

function renderItem(item: FeedItem): string {
  const media = item.imageUrl
    ? `
      <enclosure url="${escapeXml(item.imageUrl)}" type="${imageMimeType(item.imageUrl)}" length="0" />
      <media:content url="${escapeXml(item.imageUrl)}" medium="image" />`
    : "";

  return `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>${media}
    </item>`;
}

export async function buildRssFeed(): Promise<string> {
  const [newsItems, reportItems] = await Promise.all([fetchNewsItems(), fetchReportItems()]);

  const items = [...newsItems, ...reportItems]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, FEED_ITEM_LIMIT);

  const lastBuildDate = (items[0]?.pubDate ?? new Date()).toUTCString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Share Barabara</title>
    <link>${SITE_URL}/</link>
    <description>Road safety news, hazard alerts, and accident reports for Kenya.</description>
    <language>en-ke</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items.map(renderItem).join("")}
  </channel>
</rss>`;
}

const FEED_PATHS = new Set(["/feed.xml", "/rss.xml"]);

export async function handleRssFeedRequest(request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (!FEED_PATHS.has(pathname)) return null;

  try {
    const xml = await buildRssFeed();
    return new Response(xml, {
      status: 200,
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=900",
      },
    });
  } catch (error) {
    console.error("[rss-feed] failed to build feed", error);
    return new Response("Failed to generate RSS feed.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
