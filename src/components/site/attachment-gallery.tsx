import { YouTubeEmbed, extractYouTubeId } from "@/lib/richtext";

export type AttachmentRow = {
  url: string;
  type: "image" | "video";
  caption?: string;
  credit?: string;
};

/** Renders a gallery of separately-attached images/videos (not inline content
 *  images) — used at the end of reports and on alert detail pages. */
export function AttachmentGallery({ attachments }: { attachments: AttachmentRow[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {attachments.map((a, i) => (
        <figure key={`${a.url}-${i}`}>
          {a.type === "video" && extractYouTubeId(a.url) ? (
            <YouTubeEmbed url={a.url} />
          ) : a.type === "video" ? (
            <video
              src={a.url}
              controls
              className="aspect-video w-full rounded-lg border border-border"
            />
          ) : (
            <img
              src={a.url}
              alt={a.caption ?? ""}
              className="aspect-video w-full rounded-lg border border-border object-cover"
            />
          )}
          {a.caption || a.credit ? (
            <figcaption className="mt-1.5 text-xs text-muted-foreground">
              {a.caption}
              {a.caption && a.credit ? " · " : ""}
              {a.credit ? `Credit: ${a.credit}` : ""}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
