import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Paperclip, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  generateEditorialDraft,
  type EditorialContentType,
  type EditorialMode,
  type EditorialProvider,
  type EditorialProposal,
  type EditorialValue,
  type EditorialFieldResults,
} from "@/lib/ai/editorial.functions";
import { filterEditorialDraftForApply } from "@/lib/ai/editorial-ui-policy";


const callGenerateEditorialDraft = generateEditorialDraft as unknown as (args: {
  data: unknown;
}) => Promise<{
  draft?: Record<string, EditorialValue>;
  proposal?: EditorialProposal;
  fieldResults?: EditorialFieldResults;
}>;

// Non-sensitive DOM diagnostic for support tickets involving stale mobile
// bundles. The backend remains authoritative for authentication and roles.
const EDITORIAL_AI_UI_VERSION = "2026-10-26-cross-device-1";

function contentLabel(contentType: EditorialContentType) {
  return contentType.charAt(0).toUpperCase() + contentType.slice(1);
}

function nonDestructiveDraft(draft: Record<string, EditorialValue>) {
  return Object.fromEntries(
    Object.entries(draft).filter(([field, value]) => {
      if (value === "" || value === null) return false;
      if (typeof value !== "string") return true;
      const placeholders: Record<string, string[]> = {
        title: ["title"],
        summary: ["summary"],
        body: ["body"],
        description: ["description"],
        content: ["content"],
      };
      return !placeholders[field]?.includes(value.trim().toLocaleLowerCase());
    }),
  ) as Record<string, EditorialValue>;
}

function sameEditorialValue(left: EditorialValue | undefined, right: EditorialValue | undefined) {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function filterUnchangedEditorialDraft(
  proposed: Record<string, EditorialValue>,
  latest?: Record<string, EditorialValue>,
  snapshot?: Record<string, EditorialValue>,
) {
  return nonDestructiveDraft(Object.fromEntries(
    Object.entries(proposed).filter(([field]) => {
      if (!latest || !snapshot || !(field in latest) || !(field in snapshot)) return true;
      return sameEditorialValue(latest[field], snapshot[field]);
    }),
  ) as Record<string, EditorialValue>);
}

function initialSourceMaterial(source: string, mode: EditorialMode) {
  if (mode === "update") return "";
  // Only remove the exact legacy scaffold. Any other non-empty text is
  // preserved because it may be genuine editor-provided source material.
  const normalized = source.trim().replace(/[ \t]+/g, " ");
  if (/^title:\s*summary:\s*body:?$/i.test(normalized)) return "";
  return source;
}

function classifyEditorialError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLocaleLowerCase();
  if (/401|unauthori[sz]ed|not authenticated|session expired|sign in|permission denied/.test(normalized)) {
    return {
      category: "authentication",
      message: "Your editorial session has expired or no longer has permission. Sign in again and retry.",
    };
  }
  if (/timeout|timed out|rate limit|429|temporarily unavailable|provider unavailable/.test(normalized)) {
    return { category: "transient-provider", message };
  }
  if (/source retrieval|could not retrieve|fetch the source/.test(normalized)) {
    return { category: "source-retrieval", message };
  }
  if (/unsupported .*field|unsupported field/.test(normalized)) {
    return {
      category: "unsupported-field",
      message: "Editorial AI proposed a field this CMS does not support. No fields were changed; contact an administrator if the problem persists.",
    };
  }
  if (/schema validation failed|source-grounding validation failed/.test(normalized)) {
    return { category: "schema-validation", message };
  }
  if (/invalid provider response|provider_json_unparseable|invalid structured response|usable draft|structured/.test(normalized)) {
    return {
      category: "provider-response",
      message: "The AI provider returned a response the CMS could not parse. No fields were changed; retry or paste the source text directly.",
    };
  }
  if (/validation failed/.test(normalized)) {
    return { category: "schema-validation", message };
  }
  return { category: "unknown", message };
}

export function EditorialAIButton({
  contentType,
  source,
  onDraft,
  mode = "autopopulate",
  provider,
  contentId,
  current,
}: {
  contentType: EditorialContentType;
  source: string;
  onDraft: (draft: Record<string, EditorialValue>) => void;
  mode?: EditorialMode;
  provider?: EditorialProvider;
  contentId?: string;
  current?: Record<string, EditorialValue>;
}) {
  const [busy, setBusy] = useState(false);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const [lastFieldResults, setLastFieldResults] = useState<EditorialFieldResults | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [sourceMaterial, setSourceMaterial] = useState(() => initialSourceMaterial(source, mode));
  const [sourceFiles, setSourceFiles] = useState<Array<{ name: string; text: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef(current);
  const requestRef = useRef(0);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
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
        ? "Populate editable fields from source material. Nothing is saved or published automatically."
        : "Extract and organize supplied source material into the supported CMS fields.";
  const selectedProvider = provider ?? (mode === "autopopulate" ? "groq" : "grok");
  const providerLabel = selectedProvider === "groq" ? "Groq" : "xAI Grok";

  async function generate() {
    if ((!sourceMaterial.trim() && sourceFiles.length === 0) || busy) return;
    const requestNumber = ++requestRef.current;
    const snapshot = currentRef.current ? { ...currentRef.current } : undefined;
    const startedAt = performance.now();
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
        data: { contentType, source: combinedSource, mode, provider: selectedProvider, ...(contentId ? { contentId } : {}), ...(mode === "update" && current ? { current } : {}) },
      });
      if (requestNumber !== requestRef.current) return;
      const proposed = result.proposal?.proposed ?? result.draft;
      if (!proposed) {
        throw new Error("No draft returned");
      }
      const latest = currentRef.current;
      const safeDraft = filterEditorialDraftForApply(proposed as Record<string, EditorialValue>, latest, snapshot, mode);
      onDraft(safeDraft);
      const serverResults = result.proposal?.fieldResults ?? result.fieldResults;
      if (serverResults) {
        setLastFieldResults({
          ...serverResults,
          populated: Object.keys(safeDraft),
        });
      }
      const durationMs = Math.round(performance.now() - startedAt);
      setLastDurationMs(durationMs);
      console.info("[Share Barabara Editorial AI] completed", { contentType, mode, provider: selectedProvider, durationMs });
      const populatedCount = Object.keys(safeDraft).length;
      const rejectedCount = serverResults ? Object.keys(serverResults.rejected).length : 0;
      toast.success(`Editorial AI populated ${populatedCount} field${populatedCount === 1 ? "" : "s"}${rejectedCount ? `; ${rejectedCount} value${rejectedCount === 1 ? " was" : "s were"} skipped` : ""}. Review before saving.`);
    } catch (error) {
      const classified = classifyEditorialError(error);
      console.warn("[Share Barabara Editorial AI] request failed", {
        category: classified.category,
        uiVersion: EDITORIAL_AI_UI_VERSION,
      });
      toast.error(classified.message || "Editorial AI could not populate the form. Retry or contact an administrator.");
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
      className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-accent"
      aria-label={title}
      data-editorial-ai-ui-version={EDITORIAL_AI_UI_VERSION}
    >
      <button
        type="button"
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={expanded}
        aria-controls={`editorial-panel-${contentType}-${mode}-${selectedProvider}`}
        onClick={() => setExpanded((value) => !value)}
      >
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
        </div>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {expanded ? <div id={`editorial-panel-${contentType}-${mode}-${selectedProvider}`} className="mt-3 space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {lastFieldResults ? <div className="rounded-md border border-border bg-muted/30 p-2 text-xs" role="status" aria-live="polite">
          <p className="font-semibold text-foreground">Latest field result</p>
          <p className="mt-1 text-muted-foreground">Populated: {lastFieldResults.populated.length ? lastFieldResults.populated.join(", ") : "none"}</p>
          <p className="text-muted-foreground">Skipped or unverified: {lastFieldResults.skipped.length ? lastFieldResults.skipped.map((field) => `${field} (${lastFieldResults.skippedReasons?.[field] ?? "not returned"})`).join("; ") : "none"}</p>
          {Object.keys(lastFieldResults.warnings ?? {}).length ? <p className="text-amber-700">Review guidance: {Object.entries(lastFieldResults.warnings ?? {}).map(([field, reason]) => `${field} (${reason})`).join("; ")}</p> : null}
          {Object.keys(lastFieldResults.rejected).length ? <p className="text-destructive">Rejected: {Object.entries(lastFieldResults.rejected).map(([field, reason]) => `${field} (${reason})`).join("; ")}</p> : null}
        </div> : null}
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
        {lastDurationMs !== null ? <p className="text-xs text-muted-foreground" role="status">Last request completed in {lastDurationMs} ms.</p> : null}
        <Button type="button" onClick={() => void generate()} disabled={busy || (!sourceMaterial.trim() && sourceFiles.length === 0)}>
          <Sparkles className="mr-2 size-4" />
          {busy
            ? "Populating fields…"
            : mode === "update"
              ? `Update Existing ${label} with AI`
              : mode === "generate"
                ? "Generate Draft from Sources"
              : `Auto-Populate with ${providerLabel}`}
        </Button>
      </div> : null}

    </section>
  );
}
