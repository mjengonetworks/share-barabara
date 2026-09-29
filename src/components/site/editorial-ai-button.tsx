import { useRef, useState } from "react";
import { ChevronDown, FileText, Paperclip, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  generateEditorialDraft,
  type EditorialContentType,
  type EditorialMode,
  type EditorialProposal,
} from "@/lib/ai/editorial.functions";

type EditorialValue = string | number | null;

const callGenerateEditorialDraft = generateEditorialDraft as unknown as (args: {
  data: unknown;
}) => Promise<{
  draft?: Record<string, EditorialValue>;
  proposal?: EditorialProposal;
}>;

function contentLabel(contentType: EditorialContentType) {
  return contentType[0].toUpperCase() + contentType.slice(1);
}

export function EditorialAIButton({
  contentType,
  source,
  onDraft,
  mode = "autopopulate",
  contentId,
}: {
  contentType: EditorialContentType;
  source: string;
  onDraft: (draft: Record<string, EditorialValue>) => void;
  mode?: EditorialMode;
  contentId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<EditorialProposal | null>(null);
  const [sourceMaterial, setSourceMaterial] = useState(mode === "update" ? "" : source);
  const [sourceFiles, setSourceFiles] = useState<Array<{ name: string; text: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const label = contentLabel(contentType);
  const title =
    mode === "update"
      ? `Update Existing ${label} with AI`
      : mode === "generate"
        ? `Generate ${label} from Sources`
        : `Auto-Populate ${label} Form Fields`;
  const description =
    mode === "update"
      ? "Combine the saved item with new material. Existing valid information is preserved by default."
      : mode === "generate"
        ? "Create a reviewable draft from source material. Nothing is saved or published automatically."
        : "Extract and organize supplied source material into the supported CMS fields for review.";
  const providerLabel = mode === "autopopulate" ? "Groq" : "xAI Grok";

  async function generate() {
    if ((!sourceMaterial.trim() && sourceFiles.length === 0) || busy) return;
    setBusy(true);
    try {
      const attachedText = sourceFiles.map((file) => `ATTACHED SOURCE: ${file.name}\n${file.text}`).join("\n\n");
      const combinedSource = [sourceMaterial, attachedText].filter(Boolean).join("\n\n");
      if (combinedSource.length > 12000) {
        toast.error("Source material and attachments together must be 12,000 characters or fewer.");
        setBusy(false);
        return;
      }
      const result = await callGenerateEditorialDraft({
        data: { contentType, source: combinedSource, mode, ...(contentId ? { contentId } : {}) },
      });
      if (mode === "update") {
        if (!result.proposal) throw new Error("No proposal returned");
        setProposal(result.proposal);
        toast.success("Editorial AI prepared a proposal. Review Current vs Proposed before applying it.");
      } else if (result.draft) {
        onDraft(result.draft);
        toast.success("Editorial AI values placed in the form. Review them before saving or publishing.");
      } else {
        throw new Error("No draft returned");
      }
    } catch {
      toast.error("Editorial AI could not prepare a proposal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const next: Array<{ name: string; text: string }> = [];
    for (const file of Array.from(files)) {
      const isText = file.type.startsWith("text/") || /\.(txt|md|csv|json|rtf)$/i.test(file.name);
      if (!isText) {
        toast.error(`${file.name}: only text documents are supported as Editorial AI evidence right now.`);
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name}: files must be 2 MB or smaller.`);
        continue;
      }
      const text = await file.text();
      if (text.length > 12000) {
        toast.error(`${file.name}: source evidence must be 12,000 characters or fewer.`);
        continue;
      }
      next.push({ name: file.name, text });
    }
    setSourceFiles((current) => {
      const available = Math.max(0, 5 - current.length);
      if (next.length > available) toast.error("You can attach up to 5 source files.");
      return [...current, ...next.slice(0, available)];
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section
      className="relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-accent"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground">
            Editorial AI
          </p>
          <h3 className="mt-1 text-base font-bold text-foreground">
            {title} <span className="font-normal text-muted-foreground">({providerLabel})</span>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mt-4 space-y-3">
        <label
          className="block text-sm font-semibold text-foreground"
          htmlFor={`editorial-source-${contentType}-${mode}`}
        >
          {mode === "update" ? "New update material" : "Source material"}
        </label>
        <textarea
          id={`editorial-source-${contentType}-${mode}`}
          value={sourceMaterial}
          onChange={(event) => setSourceMaterial(event.target.value.slice(0, 12000))}
          rows={5}
          className="flex min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={
            mode === "update"
              ? "Paste the new verified information or source notes here…"
              : "Paste source notes, document text or verified URLs here…"
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json,.rtf,text/*" className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Paperclip className="mr-1.5 size-3.5" /> Attach text files
          </Button>
          <span className="text-xs text-muted-foreground">TXT, MD, CSV, JSON or RTF · 2 MB each</span>
        </div>
        <p className="text-xs text-muted-foreground">Image source analysis coming soon. Use the normal featured-image upload for article media.</p>
        {sourceFiles.length > 0 ? <ul className="space-y-1 text-xs text-muted-foreground" aria-label="Attached source files">{sourceFiles.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center gap-2"><FileText className="size-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" className="rounded p-1 hover:bg-muted" aria-label={`Remove ${file.name}`} onClick={() => setSourceFiles((current) => current.filter((_, i) => i !== index))}><X className="size-3.5" /></button></li>)}</ul> : null}
        <Button type="button" onClick={() => void generate()} disabled={busy || (!sourceMaterial.trim() && sourceFiles.length === 0)}>
          <Sparkles className="mr-2 size-4" />
          {busy
            ? "Preparing proposal…"
            : mode === "update"
              ? `Update Existing ${label} with AI`
              : mode === "generate"
                ? "Generate Draft from Sources"
                : "Auto-Populate Form Fields"}
        </Button>
      </div>

      {proposal ? (
        <div className="mt-4 space-y-3 rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm">
          <p className="font-semibold text-foreground">Current vs Proposed</p>
          <div className="space-y-3">
            {proposal.changedFields.map((field) => (
              <div key={field} className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Current · {field}
                  </p>
                  <p className="break-words">{String(proposal.current[field] ?? "—")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Proposed
                  </p>
                  <p className="break-words">{String(proposal.proposed[field] ?? "—")}</p>
                </div>
              </div>
            ))}
            {proposal.changedFields.length === 0 ? (
              <p className="text-muted-foreground">No supported field changes were proposed.</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onDraft(proposal.proposed);
              setProposal(null);
              toast.success("Proposed values placed in the editable form. Save through the normal workflow.");
            }}
          >
            Apply proposed values to form
          </Button>
        </div>
      ) : null}
    </section>
  );
}
