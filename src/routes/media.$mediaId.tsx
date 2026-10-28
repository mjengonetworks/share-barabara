import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { youtubeId } from "@/lib/video";
import { MjengoPreviews } from "@/components/site/mjengo-previews";

export const Route = createFileRoute("/media/$mediaId")({
  loader: async ({ params }) => {
    const { data } = await (supabase.from("videos") as any).select("id,title,description,video_url,created_at,status").eq("id", params.mediaId).eq("status", "featured").maybeSingle();
    return data;
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.title ?? "Media"}: Share Barabara` }] }),
  component: MediaDetailPage,
});

function MediaDetailPage() {
  const { mediaId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { data: media, isLoading } = useQuery({
    queryKey: ["media-detail", mediaId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("videos") as any).select("id,title,description,video_url,created_at,status").eq("id", mediaId).eq("status", "featured").maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData: loaderData,
  });
  if (isLoading) return <p className="mx-auto max-w-4xl px-4 py-20 text-muted-foreground">Loading media…</p>;
  if (!media) return <div className="mx-auto max-w-4xl px-4 py-20"><h1 className="text-xl font-bold">Media not found</h1><Link to="/media" className="mt-4 inline-block text-brand-blue underline">Back to Media Directory</Link></div>;
  const id = youtubeId(media.video_url);
  return <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10"><Link to="/media" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Media Directory</Link><article className="mt-5 overflow-hidden rounded-xl border border-border bg-card"><div className="aspect-video bg-muted">{id ? <iframe className="size-full" src={`https://www.youtube.com/embed/${id}`} title={media.title} allowFullScreen /> : <a href={media.video_url} target="_blank" rel="noopener noreferrer" className="flex size-full items-center justify-center text-brand-blue underline"><Film className="mr-2 size-6" /> Open media source</a>}</div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wider text-accent-foreground">Share Barabara media</p><h1 className="mt-1 text-2xl font-extrabold">{media.title}</h1>{media.description ? <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{media.description}</p> : null}<a href={media.video_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-brand-blue underline">Open canonical media source</a><time className="mt-3 block text-xs text-muted-foreground" dateTime={media.created_at}>{new Date(media.created_at).toLocaleDateString("en-KE")}</time></div></article><div className="mt-10"><MjengoPreviews context="media" /></div></div>;
}
