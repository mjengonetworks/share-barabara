import type { ReactNode } from "react";
import katex from "katex";

/**
 * A deliberately small markdown-lite dialect, not full CommonMark: bold
 * (**text**), italic (*text*), links ([text](url)), block images
 * (![alt](url) alone on its own line/paragraph), a video embed marker
 * ({{video:URL}} alone on its own line/paragraph) for YouTube links, and
 * LaTeX math ($inline$ or $$block$$, rendered with KaTeX). Existing
 * plain-text content (paragraphs separated by a blank line) keeps rendering
 * exactly as before, since none of that syntax appears in it.
 */

/** trust:false (the default) disables LaTeX commands that could otherwise
 *  reach into the page (\href, \includegraphics, etc.) -- required since
 *  this renders arbitrary user-submitted formulas. */
function renderMath(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode });
  } catch {
    return latex;
  }
}

// The 5th alternative ($...$) is inline LaTeX math, rendered with KaTeX.
const INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|\$([^$\n]+)\$/g;

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-blue underline"
        >
          {match[1]}
        </a>,
      );
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${i++}`}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${i++}`}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      nodes.push(
        <span
          key={`${keyPrefix}-${i++}`}
          dangerouslySetInnerHTML={{ __html: renderMath(match[5], false) }}
        />,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Extracts an 11-character YouTube video ID from any common URL shape. */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? (match[1] ?? null) : null;
}

export function YouTubeEmbed({ url, className = "" }: { url: string; className?: string }) {
  const id = extractYouTubeId(url);
  if (!id) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">
        {url}
      </a>
    );
  }
  return (
    <div
      className={`aspect-video w-full overflow-hidden rounded-lg border border-border ${className}`}
    >
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title="Embedded video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="size-full"
      />
    </div>
  );
}

const VIDEO_BLOCK_RE = /^\{\{video:(.+)\}\}$/;
const MATH_BLOCK_RE = /^\$\$([\s\S]+)\$\$$/;
// Optional quoted title after the URL carries "caption::credit" (both
// optional), a convention this app's own editor writes — plain
// ![alt](url) with no title still renders exactly as before.
const IMAGE_BLOCK_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;

/** Renders rich-text-lite content as paragraphs, inline formatting, block
 *  images (with an optional caption/credit) and embedded YouTube videos. */
export function renderRichText(content: string): ReactNode {
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    const videoMatch = trimmed.match(VIDEO_BLOCK_RE);
    if (videoMatch) return <YouTubeEmbed key={i} url={videoMatch[1] ?? ""} className="my-4" />;
    const mathMatch = trimmed.match(MATH_BLOCK_RE);
    if (mathMatch) {
      return (
        <div
          key={i}
          className="my-4 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4"
          dangerouslySetInnerHTML={{ __html: renderMath((mathMatch[1] ?? "").trim(), true) }}
        />
      );
    }
    const imageMatch = trimmed.match(IMAGE_BLOCK_RE);
    if (imageMatch) {
      const [caption, credit] = (imageMatch[3] ?? "").split("::");
      return (
        <figure key={i} className="my-4">
          <img
            src={imageMatch[2]}
            alt={imageMatch[1]}
            className="w-full rounded-lg border border-border object-cover"
          />
          {caption || credit ? (
            <figcaption className="mt-1.5 text-xs text-muted-foreground">
              {caption}
              {caption && credit ? " · " : ""}
              {credit ? <em>Credit: {credit}</em> : null}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    return (
      <p key={i} className="whitespace-pre-wrap">
        {parseInline(trimmed, String(i))}
      </p>
    );
  });
}
