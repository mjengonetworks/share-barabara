/** Pure helpers shared by the editor, AI normalisation and public renderer. */

export type InlineImageMetadata = {
  alt: string;
  url: string;
  caption: string;
  credit: string;
  raw: string;
};

const IMAGE_BLOCK_RE = /^!\[([^\]]*)\]\((\S+?)(?:\s+"([^"]*)")?\)$/;

function decodePart(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodePart(value: string) {
  return encodeURIComponent(value.trim());
}

export function parseInlineImageBlock(value: string): InlineImageMetadata | null {
  const match = value.trim().match(IMAGE_BLOCK_RE);
  if (!match) return null;
  const title = match[3] ?? "";
  const separator = title.indexOf("::");
  const encodedCaption = separator >= 0 ? title.slice(0, separator) : title;
  const encodedCredit = separator >= 0 ? title.slice(separator + 2) : "";
  return {
    alt: match[1] ?? "",
    url: match[2] ?? "",
    caption: decodePart(encodedCaption),
    credit: decodePart(encodedCredit),
    raw: value.trim(),
  };
}

export function serializeInlineImageBlock(input: Omit<InlineImageMetadata, "raw">) {
  const title =
    input.caption.trim() || input.credit.trim()
      ? ` "${encodePart(input.caption)}::${encodePart(input.credit)}"`
      : "";
  return `![${input.alt.trim()}](${input.url.trim()}${title})`;
}

export function replaceInlineImageAt(
  content: string,
  blockIndex: number,
  image: Omit<InlineImageMetadata, "raw">,
) {
  const blocks = content.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const current = blocks[blockIndex];
  if (!current || !parseInlineImageBlock(current)) return content;
  blocks[blockIndex] = serializeInlineImageBlock(image);
  return blocks.join("\n\n");
}

/**
 * AI providers sometimes return paragraphs separated by HTML block tags or
 * single line breaks. Convert only those presentation boundaries to the
 * editor's blank-line block format; URLs and structured values are untouched.
 */
export function normalizeRichTextForEditor(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n\n")
    .replace(/<p(?:\s[^>]*)?>/gi, "")
    .replace(/<\/div\s*>/gi, "\n\n")
    .replace(/<div(?:\s[^>]*)?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isSafeRichTextUrl(value: string, kind: "href" | "media" = "href") {
  const trimmed = value.trim();
  if (!trimmed || Array.from(trimmed).some((character) => character.charCodeAt(0) < 32))
    return false;
  if (/^(?:javascript|vbscript|data):/i.test(trimmed)) return false;
  if (kind === "media") return /^(?:https?:\/\/|\/|blob:)/i.test(trimmed);
  return /^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed);
}
