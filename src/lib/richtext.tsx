import type { ReactNode } from "react";
import katex from "katex";
import { EditorialMediaMeta } from "@/components/site/editorial-media-meta";
import { isSafeRichTextUrl, parseInlineImageBlock, type InlineImageMetadata } from "@/lib/rich-text-format";

export type RichTextRenderOptions = {
  onImageClick?: (image: InlineImageMetadata & { blockIndex: number }) => void;
};

function renderMath(latex: string, displayMode: boolean): string {
  try { return katex.renderToString(latex, { throwOnError: false, displayMode }); } catch { return latex; }
}

const INLINE_RE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\+\+([^+]+)\+\+|\*([^*]+)\*|\$([^$\n]+)\$|\[\[color:(#[0-9a-fA-F]{3,8})\]\]([\s\S]*?)\[\[\/color\]\]|\[\[highlight:(#[0-9a-fA-F]{3,8})\]\]([\s\S]*?)\[\[\/highlight\]\]/g;

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      if (isSafeRichTextUrl(match[2] ?? "")) nodes.push(<a key={`${keyPrefix}-${i++}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">{match[1]}</a>);
      else nodes.push(match[1]);
    } else if (match[3] !== undefined) nodes.push(<strong key={`${keyPrefix}-${i++}`}>{match[3]}</strong>);
    else if (match[4] !== undefined) nodes.push(<u key={`${keyPrefix}-${i++}`}>{match[4]}</u>);
    else if (match[5] !== undefined) nodes.push(<s key={`${keyPrefix}-${i++}`}>{match[5]}</s>);
    else if (match[6] !== undefined) nodes.push(<span key={`${keyPrefix}-${i++}`} className="rounded-sm bg-muted px-0.5">{match[6]}</span>);
    else if (match[7] !== undefined) nodes.push(<em key={`${keyPrefix}-${i++}`}>{match[7]}</em>);
    else if (match[8] !== undefined) nodes.push(<span key={`${keyPrefix}-${i++}`} dangerouslySetInnerHTML={{ __html: renderMath(match[8], false) }} />);
    else if (match[9] !== undefined) nodes.push(<span key={`${keyPrefix}-${i++}`} style={{ color: match[9] }}>{match[10]}</span>);
    else if (match[11] !== undefined) nodes.push(<span key={`${keyPrefix}-${i++}`} style={{ backgroundColor: match[11] }}>{match[12]}</span>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? (match[1] ?? null) : null;
}

export function YouTubeEmbed({ url, className = "" }: { url: string; className?: string }) {
  const id = extractYouTubeId(url);
  if (!id) return isSafeRichTextUrl(url) ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">{url}</a> : null;
  return <div className={`aspect-video w-full overflow-hidden rounded-lg border border-border ${className}`}><iframe src={`https://www.youtube.com/embed/${id}`} title="Embedded video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="size-full" /></div>;
}

const VIDEO_BLOCK_RE = /^\{\{video:(.+)\}\}$/;
const MATH_BLOCK_RE = /^\$\$([\s\S]+)\$\$$/;
const ALIGN_BLOCK_RE = /^\[\[align:(left|center|right|justify)\]\]\n?([\s\S]*?)\n?\[\[\/align\]\]$/;
const INDENT_BLOCK_RE = /^\[\[indent:([1-4])\]\]\n?([\s\S]*?)\n?\[\[\/indent\]\]$/;
const COLOR_BLOCK_RE = /^\[\[color:(#[0-9a-fA-F]{3,8})\]\]\n?([\s\S]*?)\n?\[\[\/color\]\]$/;
const HIGHLIGHT_BLOCK_RE = /^\[\[highlight:(#[0-9a-fA-F]{3,8})\]\]\n?([\s\S]*?)\n?\[\[\/highlight\]\]$/;

export function splitRichTextBlocks(content: string): string[] {
  const normalized = content.replace(/\r\n?/g, "\n").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/p\s*>/gi, "\n\n").replace(/<p(?:\s[^>]*)?>/gi, "").replace(/<\/?(?:div|section|article)(?:\s[^>]*)?>/gi, "\n\n");
  return normalized.split(/\n\s*\n/).filter((block) => block.trim().length > 0);
}

function renderNested(content: string, options: RichTextRenderOptions, prefix: string) {
  return splitRichTextBlocks(content).map((block, index) => renderBlock(block, options, `${prefix}-${index}`));
}

function renderBlock(block: string, options: RichTextRenderOptions, key: string): ReactNode {
  const trimmed = block.trim();
  const aligned = trimmed.match(ALIGN_BLOCK_RE);
  if (aligned) return <div key={key} style={{ textAlign: aligned[1] as "left" | "center" | "right" | "justify" }}>{renderNested(aligned[2] ?? "", options, key)}</div>;
  const indented = trimmed.match(INDENT_BLOCK_RE);
  if (indented) return <div key={key} style={{ marginInlineStart: `${Number(indented[1] ?? 1) * 1.5}rem` }}>{renderNested(indented[2] ?? "", options, key)}</div>;
  const coloured = trimmed.match(COLOR_BLOCK_RE);
  if (coloured) return <div key={key} style={{ color: coloured[1] }}>{renderNested(coloured[2] ?? "", options, key)}</div>;
  const highlighted = trimmed.match(HIGHLIGHT_BLOCK_RE);
  if (highlighted) return <div key={key} style={{ backgroundColor: highlighted[1] }}>{renderNested(highlighted[2] ?? "", options, key)}</div>;
  const videoMatch = trimmed.match(VIDEO_BLOCK_RE);
  if (videoMatch) return <YouTubeEmbed key={key} url={videoMatch[1] ?? ""} className="my-4" />;
  const mathMatch = trimmed.match(MATH_BLOCK_RE);
  if (mathMatch) return <div key={key} className="my-4 overflow-x-auto rounded-lg border border-border bg-muted/30 p-4" dangerouslySetInnerHTML={{ __html: renderMath((mathMatch[1] ?? "").trim(), true) }} />;
  const image = parseInlineImageBlock(trimmed);
  if (image && isSafeRichTextUrl(image.url, "media")) {
    const imageIndex = Number(key.split("-").pop() ?? 0);
    return <figure key={key} className="my-4"><img src={image.url} alt={image.alt} className={`w-full rounded-lg border border-border object-contain ${options.onImageClick ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring" : ""}`} tabIndex={options.onImageClick ? 0 : undefined} role={options.onImageClick ? "button" : undefined} onClick={() => options.onImageClick?.({ ...image, blockIndex: imageIndex })} onKeyDown={(event) => { if (options.onImageClick && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); options.onImageClick({ ...image, blockIndex: imageIndex }); } }} /><EditorialMediaMeta caption={image.caption} credit={image.credit} /></figure>;
  }
  const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const Heading = heading[1]?.length === 1 ? "h2" : heading[1]?.length === 2 ? "h3" : "h4";
    return <Heading key={key} className="font-bold leading-tight">{parseInline(heading[2] ?? "", key)}</Heading>;
  }
  if (/^```(?:[\w+-]+)?\n[\s\S]*\n```$/.test(trimmed)) return <pre key={key} className="overflow-x-auto rounded-lg bg-muted p-3 text-sm"><code>{trimmed.replace(/^```[^\n]*\n|\n```$/g, "")}</code></pre>;
  const lines = trimmed.split("\n");
  if (lines.length > 0 && lines.every((line) => /^\s*(?:[-*+] |\d+[.)] )/.test(line))) {
    const ordered = /^\s*\d+[.)] /.test(lines[0] ?? "");
    const List = ordered ? "ol" : "ul";
    return <List key={key} className={`${ordered ? "list-decimal" : "list-disc"} list-inside space-y-1`}>{lines.map((line, index) => <li key={`${key}-${index}`}>{parseInline(line.replace(/^\s*(?:[-*+] |\d+[.)] )/, ""), `${key}-${index}`)}</li>)}</List>;
  }
  if (lines.every((line) => /^\s*> ?/.test(line))) return <blockquote key={key} className="border-l-2 border-border pl-4 italic text-muted-foreground">{lines.map((line, index) => <p key={`${key}-${index}`}>{parseInline(line.replace(/^\s*> ?/, ""), `${key}-${index}`)}</p>)}</blockquote>;
  return <p key={key} className="whitespace-pre-wrap leading-7">{parseInline(trimmed, key)}</p>;
}

export function renderRichText(content: string, options: RichTextRenderOptions = {}): ReactNode {
  return splitRichTextBlocks(content).map((block, index) => renderBlock(block, options, `block-${index}`));
}
