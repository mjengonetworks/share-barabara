import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Film, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { youtubeId } from "@/lib/video";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicPageHero } from "@/components/site/public-page-hero";
import { SocialFollowSection } from "@/components/site/social-follow-section";
import { MjengoPreviews } from "@/components/site/mjengo-previews";
import { EditorialMediaMeta } from "@/components/site/editorial-media-meta";

export const Route = createFileRoute("/media")({
  head: () => ({ meta: [{ title: "Media Directory: Share Barabara" }, { name: "description", content: "Browse approved road-safety videos and media from Share Barabara." }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q.slice(0, 80) : "",
    type: search.type === "video" ? "video" : "all",
  }),
  component: MediaDirectoryPage,
});

function MediaDirectoryPage() {
  const { q = "", type = "all" } = Route.useSearch();
  const [draft, setDraft] = useState(q);
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["media-directory-videos"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("videos") as any)
        .select("id,title,description,video_url,created_at,status,user_id")
        .eq("status", "featured")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: editorialMedia = [] } = useQuery({
    queryKey: ["media-directory-editorial"],
    queryFn: async () => {
      const [articles, alerts, reports, campaigns, issues] = await Promise.all([
        (supabase.from("news") as any).select("id,slug,title,summary,image_url,image_caption,image_credit,published_at").eq("status", "published").not("image_url", "is", null).limit(40),
        (supabase.from("alerts") as any).select("id,title,description,image_url,image_caption,image_credit,created_at").eq("status", "active").not("image_url", "is", null).limit(40),
        (supabase.from("accident_reports") as any).select("id,title,description,image_url,image_caption,image_credit,occurred_at").eq("status", "approved").not("image_url", "is", null).limit(40),
        (supabase.from("campaigns") as any).select("id,slug,title,description,image_url,image_caption,image_credit,start_date").not("image_url", "is", null).limit(40),
        (supabase.from("infrastructure_issues") as any).select("id,title,summary,image_url,image_caption,image_credit,created_at").eq("status", "approved").not("image_url", "is", null).limit(40),
      ]);
      return [
        ...(articles.data ?? []).map((row: any) => ({ ...row, kind: "Article", body: row.summary, created_at: row.published_at, href: `/news/${row.slug}` })),
        ...(alerts.data ?? []).map((row: any) => ({ ...row, kind: "Alert", body: row.description, href: `/alerts/${row.id}` })),
        ...(reports.data ?? []).map((row: any) => ({ ...row, kind: "Accident report", body: row.description, created_at: row.occurred_at, href: `/reports/${row.id}` })),
        ...(campaigns.data ?? []).map((row: any) => ({ ...row, kind: "Campaign", body: row.description, created_at: row.start_date, href: `/campaigns/${row.slug}` })),
        ...(issues.data ?? []).map((row: any) => ({ ...row, kind: "Infrastructure issue", body: row.summary, href: `/infrastructure-issues/${row.id}` })),
      ].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    },
  });
  const query = q.trim().toLowerCase();
  const filtered = videos.filter((video: any) => !query || `${video.title} ${video.description ?? ""}`.toLowerCase().includes(query));
  const filteredEditorial = editorialMedia.filter((item: any) => !query || `${item.title} ${item.body ?? ""} ${item.kind}`.toLowerCase().includes(query));
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PublicPageHero eyebrow="Media & Feed" title="Media Directory" description="Browse approved videos and media linked to road-safety, transport and infrastructure stories." />
      <SocialFollowSection />
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="navigation" aria-label="Media filters">
          <Link to="/media" search={{ q, type: "all" }} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${type === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All media</Link>
          <Link to="/media" search={{ q, type: "video" }} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${type === "video" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Videos</Link>
        </div>
        <form method="get" action="/media" className="flex w-full gap-2 sm:w-auto">
          <Input name="q" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search media" aria-label="Search media" />
          <Button type="submit" size="icon" aria-label="Search media"><Search className="size-4" /></Button>
        </form>
      </div>
      {isLoading ? <p className="mt-6 text-muted-foreground">Loading media…</p> : null}
      {!isLoading && !filtered.length ? <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No approved media matches this search.</p> : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((video: any) => {
          const id = youtubeId(video.video_url);
          return <Link key={video.id} to="/media/$mediaId" params={{ mediaId: video.id }} className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent">
            <div className="aspect-video bg-muted">{id ? <iframe className="size-full" src={`https://www.youtube.com/embed/${id}`} title={video.title} loading="lazy" allowFullScreen /> : <div className="flex size-full items-center justify-center"><Film className="size-8 text-muted-foreground" /></div>}</div>
            <div className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-accent-foreground">Video</p><h2 className="mt-1 font-bold">{video.title}</h2>{video.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{video.description}</p> : null}<time className="mt-3 block text-xs text-muted-foreground" dateTime={video.created_at}>{new Date(video.created_at).toLocaleDateString("en-KE")}</time></div>
          </Link>;
        })}
      </div>
      {filteredEditorial.length ? <section className="mt-10" aria-labelledby="editorial-media-heading"><h2 id="editorial-media-heading" className="text-xl font-bold">Editorial media</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredEditorial.map((item: any) => <Link key={`${item.kind}-${item.id}`} to={item.href as any} className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-accent"><img src={item.image_url} alt={item.title} loading="lazy" className="max-h-72 w-full bg-muted object-contain" /><div className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-accent-foreground">{item.kind}</p><h3 className="mt-1 font-bold">{item.title}</h3><EditorialMediaMeta caption={item.image_caption} credit={item.image_credit} /><p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.body}</p></div></Link>)}</div></section> : null}
      <div className="mt-10"><MjengoPreviews context="media" /></div>
    </div>
  );
}
