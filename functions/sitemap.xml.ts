interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const baseUrl = "https://sharebarabara.co.ke";

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/incidents?select=id,updated_at&order=created_at.desc&limit=1000`,
    {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    }
  );

  const incidents = await res.json();

  const staticUrls = [
    `${baseUrl}/`,
    `${baseUrl}/about`,
  ];

  const dynamicUrls = Array.isArray(incidents)
    ? incidents.map((item) => `
    <url>
      <loc>${baseUrl}/incident/${item.id}</loc>
      <lastmod>${new Date(item.updated_at || Date.now()).toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>0.8</priority>
    </url>`).join("")
    : "";

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls.map((url) => `
  <url>
    <loc>${url}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`).join("")}
  ${dynamicUrls}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
