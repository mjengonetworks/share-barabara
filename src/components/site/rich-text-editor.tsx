import { useRef, useState } from "react";
import { Bold, Eye, Image as ImageIcon, Italic, Link2, PencilLine, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { renderRichText } from "@/lib/richtext";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
};

/** Wraps the current selection (or inserts at the cursor) with markers, then
 *  restores focus and a sane selection so the user can keep typing. */
function applyInline(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  before: string,
  after: string,
  placeholder: string,
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
  });
}

function insertBlock(
  textarea: HTMLTextAreaElement,
  value: string,
  onChange: (v: string) => void,
  block: string,
) {
  const start = textarea.selectionStart;
  const needsLeadingBreak = start > 0 && value[start - 1] !== "\n";
  const insertion = `${needsLeadingBreak ? "\n\n" : ""}${block}\n\n`;
  const next = value.slice(0, start) + insertion + value.slice(start);
  onChange(next);
  const cursor = start + insertion.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursor, cursor);
  });
}

export function RichTextEditor({ id, value, onChange, rows = 8, placeholder, required }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  return (
    <div className="rounded-md border border-input">
      <div className="flex flex-wrap items-center gap-1 border-b border-input bg-muted/40 p-1.5">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          title="Bold"
          disabled={preview}
          onClick={() =>
            ref.current && applyInline(ref.current, value, onChange, "**", "**", "bold text")
          }
        >
          <Bold className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          title="Italic"
          disabled={preview}
          onClick={() =>
            ref.current && applyInline(ref.current, value, onChange, "*", "*", "italic text")
          }
        >
          <Italic className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          title="Insert link"
          disabled={preview}
          onClick={() => {
            if (!ref.current) return;
            const url = window.prompt("Link URL");
            if (!url) return;
            applyInline(ref.current, value, onChange, "[", `](${url})`, "link text");
          }}
        >
          <Link2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          title="Insert image"
          disabled={preview}
          onClick={() => {
            if (!ref.current) return;
            const url = window.prompt("Image URL");
            if (!url) return;
            const alt = window.prompt("Image description (optional)") ?? "";
            insertBlock(ref.current, value, onChange, `![${alt}](${url})`);
          }}
        >
          <ImageIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          title="Insert YouTube video"
          disabled={preview}
          onClick={() => {
            if (!ref.current) return;
            const url = window.prompt("YouTube video URL");
            if (!url) return;
            insertBlock(ref.current, value, onChange, `{{video:${url}}}`);
          }}
        >
          <Video className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto h-7 gap-1 px-2 text-xs"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? <PencilLine className="size-3.5" /> : <Eye className="size-3.5" />}
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>
      {preview ? (
        <div className="min-h-32 space-y-3 p-3 text-sm">
          {value.trim() ? (
            renderRichText(value)
          ) : (
            <p className="text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <Textarea
          id={id}
          ref={ref}
          required={required}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="rounded-t-none border-0 focus-visible:ring-0"
        />
      )}
    </div>
  );
}
