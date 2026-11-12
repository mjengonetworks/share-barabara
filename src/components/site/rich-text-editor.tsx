import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code2, Eraser, Eye,
  Highlighter, Image as ImageIcon, IndentDecrease, IndentIncrease, Italic, Link2,
  List, ListOrdered, Loader2, PencilLine, Quote, Redo2, Sigma, Strikethrough,
  Underline, Undo2, Unlink, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { renderRichText, splitRichTextBlocks } from "@/lib/richtext";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/storage";
import { replaceInlineImageAt, serializeInlineImageBlock, type InlineImageMetadata } from "@/lib/rich-text-format";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
};

type ImageDraft = Omit<InlineImageMetadata, "raw"> & { blockIndex: number };

function normalizePastedText(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  const flush = () => { if (current.length) blocks.push(current.join("\n").trim()); current = []; };
  for (const line of lines) {
    if (!line.trim()) { flush(); continue; }
    const isList = /^\s*(?:[-*+] |\d+[.)] )/.test(line);
    if (current.length && !isList) flush();
    current.push(line);
  }
  flush();
  return blocks.filter(Boolean).join("\n\n");
}

function selectedRange(textarea: HTMLTextAreaElement, value: string) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  return { start, end, selected: value.slice(start, end) || "text" };
}

function ToolbarButton({ label, children, disabled, onClick }: { label: string; children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0" title={label} aria-label={label} data-rich-text-control={label} disabled={disabled} onClick={onClick}>{children}</Button>;
}

export function RichTextEditor({ id, value, onChange, rows = 8, placeholder, required }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const history = useRef<{ past: string[]; future: string[]; current: string }>({ past: [], future: [], current: value });
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageDraft, setImageDraft] = useState<ImageDraft | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (history.current.current !== value) history.current.current = value;
  }, [value]);

  function setValue(next: string) {
    const current = history.current.current;
    if (next === current) return;
    history.current.past = [...history.current.past.slice(-49), current];
    history.current.future = [];
    history.current.current = next;
    onChange(next);
  }

  function undo() {
    const previous = history.current.past.pop();
    if (previous === undefined) return;
    history.current.future.push(history.current.current);
    history.current.current = previous;
    onChange(previous);
  }

  function redo() {
    const next = history.current.future.pop();
    if (next === undefined) return;
    history.current.past.push(history.current.current);
    history.current.current = next;
    onChange(next);
  }

  function transformSelection(transform: (selected: string) => string, placeholder = "text") {
    if (!ref.current) return;
    const { start, end, selected } = selectedRange(ref.current, value);
    const actual = value.slice(start, end) || placeholder;
    const replacement = transform(actual);
    setValue(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.focus();
      ref.current.setSelectionRange(start, start + replacement.length);
    });
  }

  function wrapInline(before: string, after: string, placeholder: string) {
    transformSelection((selected) => `${before}${selected}${after}`, placeholder);
  }

  function wrapBlock(before: string, after: string, placeholder: string) {
    transformSelection((selected) => `${before}\n${selected}\n${after}`, placeholder);
  }

  function transformLines(transform: (line: string, index: number) => string) {
    transformSelection((selected) => selected.split("\n").map(transform).join("\n"));
  }

  function applyStyle(style: string) {
    if (style === "paragraph") transformLines((line) => line.replace(/^#{1,3}\s+/, ""));
    else transformLines((line) => `${"#".repeat(Number(style))} ${line.replace(/^#{1,3}\s+/, "")}`);
  }

  function insertBlock(block: string) {
    if (!ref.current) return;
    const start = ref.current.selectionStart;
    const needsLeadingBreak = start > 0 && value[start - 1] !== "\n";
    const insertion = `${needsLeadingBreak ? "\n\n" : ""}${block}\n\n`;
    setValue(value.slice(0, start) + insertion + value.slice(ref.current.selectionEnd));
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(start + insertion.length, start + insertion.length); });
  }

  function unlinkSelection() {
    transformSelection((selected) => selected.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1"));
  }

  function clearFormatting() {
    transformSelection((selected) => selected
      .replace(/\*\*|__|~~|\+\+/g, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/^> ?/gm, ""));
  }

  async function handleImageFile(file: File | undefined) {
    if (!file || !user || !ref.current) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id);
      const block = serializeInlineImageBlock({ alt: "", url, caption: "", credit: "" });
      const start = ref.current.selectionStart;
      const next = `${value.slice(0, start)}${start > 0 && value[start - 1] !== "\n" ? "\n\n" : ""}${block}\n\n${value.slice(ref.current.selectionEnd)}`;
      setValue(next);
      const blockIndex = splitRichTextBlocks(next).findIndex((item) => item.trim() === block);
      setImageDraft({ blockIndex: Math.max(0, blockIndex), alt: "", url, caption: "", credit: "" });
      setPreview(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openImageMetadata(image: InlineImageMetadata & { blockIndex: number }) {
    setImageDraft({ blockIndex: image.blockIndex, alt: image.alt, url: image.url, caption: image.caption, credit: image.credit });
  }

  function closeImageMetadata(save: boolean) {
    if (save && imageDraft) {
      setValue(replaceInlineImageAt(value, imageDraft.blockIndex, imageDraft));
    }
    setImageDraft(null);
  }

  const disabled = preview || uploading;
  return (
    <div className="rounded-md border border-input">
      <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 p-1.5" role="toolbar" aria-label="Rich-text formatting">
        <ToolbarButton label="Undo" disabled={preview} onClick={undo}><Undo2 className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Redo" disabled={preview} onClick={redo}><Redo2 className="size-3.5" /></ToolbarButton>
        <select aria-label="Text style" title="Text style" data-rich-text-control="Text style" disabled={disabled} defaultValue="paragraph" className="h-7 max-w-28 rounded border border-input bg-background px-1 text-xs" onChange={(event) => { applyStyle(event.target.value); event.currentTarget.value = "paragraph"; }}><option value="paragraph">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option></select>
        <ToolbarButton label="Bold" disabled={disabled} onClick={() => wrapInline("**", "**", "bold text")}><Bold className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Italic" disabled={disabled} onClick={() => wrapInline("*", "*", "italic text")}><Italic className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Underline" disabled={disabled} onClick={() => wrapInline("__", "__", "underlined text")}><Underline className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Strikethrough" disabled={disabled} onClick={() => wrapInline("~~", "~~", "struck text")}><Strikethrough className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Align left" disabled={disabled} onClick={() => wrapBlock("[[align:left]]", "[[/align]]", "left-aligned text")}><AlignLeft className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Align centre" disabled={disabled} onClick={() => wrapBlock("[[align:center]]", "[[/align]]", "centred text")}><AlignCenter className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Align right" disabled={disabled} onClick={() => wrapBlock("[[align:right]]", "[[/align]]", "right-aligned text")}><AlignRight className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Justify" disabled={disabled} onClick={() => wrapBlock("[[align:justify]]", "[[/align]]", "justified text")}><AlignJustify className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Bulleted list" disabled={disabled} onClick={() => transformLines((line) => /^\s*[-*+] /.test(line) ? line : `- ${line}`)}><List className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Numbered list" disabled={disabled} onClick={() => transformLines((line, index) => /^\s*\d+[.)] /.test(line) ? line : `${index + 1}. ${line}`)}><ListOrdered className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Increase indent" disabled={disabled} onClick={() => wrapBlock("[[indent:1]]", "[[/indent]]", "indented text")}><IndentIncrease className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Decrease indent" disabled={disabled} onClick={() => transformLines((line) => line.replace(/^ {4}/, ""))}><IndentDecrease className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Insert or edit link" disabled={disabled} onClick={() => { const url = window.prompt("Link URL"); if (url) wrapInline("[", `](${url})`, "link text"); }}><Link2 className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Unlink" disabled={disabled} onClick={unlinkSelection}><Unlink className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Blockquote" disabled={disabled} onClick={() => transformLines((line) => /^\s*> ?/.test(line) ? line : `> ${line}`)}><Quote className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Code formatting" disabled={disabled} onClick={() => wrapBlock("```", "```", "code")}><Code2 className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Text colour" disabled={disabled} onClick={() => { const colour = window.prompt("Text colour (hex, for example #1d4ed8)"); if (colour && /^#[0-9a-f]{3,8}$/i.test(colour)) wrapBlock(`[[color:${colour}]]`, "[[/color]]", "coloured text"); }}><span className="text-xs font-bold text-brand-blue">A</span></ToolbarButton>
        <ToolbarButton label="Background highlighting" disabled={disabled} onClick={() => { const colour = window.prompt("Highlight colour (hex, for example #fef08a)"); if (colour && /^#[0-9a-f]{3,8}$/i.test(colour)) wrapBlock(`[[highlight:${colour}]]`, "[[/highlight]]", "highlighted text"); }}><Highlighter className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Clear formatting" disabled={disabled} onClick={clearFormatting}><Eraser className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Upload image" disabled={disabled} onClick={() => fileRef.current?.click()}>{uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />}</ToolbarButton>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleImageFile(event.target.files?.[0])} />
        <ToolbarButton label="Insert video" disabled={disabled} onClick={() => { const url = window.prompt("YouTube video URL"); if (url) insertBlock(`{{video:${url}}}`); }}><Video className="size-3.5" /></ToolbarButton>
        <ToolbarButton label="Math formula" disabled={disabled} onClick={() => wrapInline("$", "$", "x^2 + y^2 = z^2")}><Sigma className="size-3.5" /></ToolbarButton>
        <Button type="button" size="sm" variant="ghost" className="ml-auto h-7 gap-1 px-2 text-xs" aria-label={preview ? "Edit rich text" : "Preview rich text"} onClick={() => setPreview((current) => !current)}>{preview ? <PencilLine className="size-3.5" /> : <Eye className="size-3.5" />}{preview ? "Edit" : "Preview"}</Button>
      </div>
      {preview ? <div className="min-h-32 space-y-3 overflow-x-auto p-3 text-sm">{value.trim() ? renderRichText(value, { onImageClick: openImageMetadata }) : <p className="text-muted-foreground">Nothing to preview yet.</p>}</div> : <Textarea id={id} ref={ref} required={required} rows={rows} value={value} onChange={(event) => setValue(event.target.value)} onPaste={(event) => { const pasted = event.clipboardData.getData("text/plain"); if (!pasted || !ref.current) return; event.preventDefault(); const start = ref.current.selectionStart; const end = ref.current.selectionEnd; const normalized = normalizePastedText(pasted); setValue(value.slice(0, start) + normalized + value.slice(end)); requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(start + normalized.length, start + normalized.length); }); }} placeholder={placeholder} className="min-h-32 rounded-t-none border-0 focus-visible:ring-0" />}
      {imageDraft ? <div className="border-t border-input bg-muted/20 p-3" role="dialog" aria-label="Inline image metadata"><p className="mb-2 text-sm font-semibold">Image metadata</p><div className="grid gap-3 sm:grid-cols-3"><div><Label htmlFor={`${id ?? "rich-text"}-image-alt`}>Alt text</Label><Input id={`${id ?? "rich-text"}-image-alt`} value={imageDraft.alt} onChange={(event) => setImageDraft({ ...imageDraft, alt: event.target.value })} placeholder="Describe what is visible" /></div><div><Label htmlFor={`${id ?? "rich-text"}-image-caption`}>Caption</Label><Input id={`${id ?? "rich-text"}-image-caption`} value={imageDraft.caption} onChange={(event) => setImageDraft({ ...imageDraft, caption: event.target.value })} placeholder="Optional caption" /></div><div><Label htmlFor={`${id ?? "rich-text"}-image-credit`}>Source / credit</Label><Input id={`${id ?? "rich-text"}-image-credit`} value={imageDraft.credit} onChange={(event) => setImageDraft({ ...imageDraft, credit: event.target.value })} placeholder="Optional source or credit" /></div></div><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => closeImageMetadata(true)}>Save &amp; Close</Button><Button type="button" size="sm" variant="outline" onClick={() => closeImageMetadata(false)}>Close / Cancel</Button></div></div> : null}
    </div>
  );
}
