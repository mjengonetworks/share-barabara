import { FileText } from "lucide-react";
import { YouTubeEmbed, extractYouTubeId } from "@/lib/richtext";
import { EditorialMediaMeta } from "@/components/site/editorial-media-meta";

export type AttachmentRow = {
  url: string;
  type: "image" | "video" | "document";
  caption?: string;
  credit?: string;
};

/** Renders a gallery of separately-attached images/videos (not inline content
 *  images) — used at the end of reports and on alert detail pages. */
export function AttachmentGallery({ attachments }: { attachments: AttachmentRow[] }) {
  if (attachments.length === 0) return null;
  const imageCount = attachments.filter((a) => a.type === "image").length;
  const videoCount = attachments.filter((a) => a.type === "video").length;
  const heading = imageCount > 0 && videoCount > 0
    ? "More photos and videos from the scene"
    : imageCount > 0
      ? "More photos from the scene"
      : videoCount > 0
        ? "More videos from the scene"
        : null;
  return (
    <section className="mt-6" aria-label={heading ?? "Additional attachments"}>
      {heading ? <h2 className="text-lg font-bold tracking-tight text-foreground">{heading}</h2> : null}
      <div className={`${heading ? "mt-3" : ""} grid gap-4 sm:grid-cols-2`}>
        {attachments.map((a, i) => (
          <figure key={`${a.url}-${i}`}>
          {a.type === "document" ? (
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm font-semibold text-brand-blue hover:border-accent hover:underline">
              <FileText className="size-5" /> Open attached document
            </a>
          ) : a.type === "video" && extractYouTubeId(a.url) ? (
            <YouTubeEmbed url={a.url} />
          ) : a.type === "video" ? (
            <video
              src={a.url}
              controls
              className="h-auto max-w-full rounded-lg border border-border"
            />
          ) : (
            <img
              src={a.url}
              alt={a.caption ?? ""}
              loading="lazy"
              className="block h-auto max-w-full rounded-lg border border-border object-contain"
            />
          )}
          <EditorialMediaMeta caption={a.caption} credit={a.credit} />
        </figure>
        ))}
      </div>
    </section>
  );
}
