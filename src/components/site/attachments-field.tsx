import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, FileVideo, ImageUp, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/storage";
import { classifyUploadFile, formatUploadSize, validateUploadFile, type UploadKind } from "@/lib/upload-validation";

export type Attachment = {
  url: string;
  type: UploadKind;
  name?: string;
  size?: number;
  mimeType?: string;
  caption?: string;
  credit?: string;
};

type Scope = "all" | "media" | "documents";

type Props = {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
  scope?: Scope;
  title?: string;
  description?: string;
};

function allowedKinds(scope: Scope): UploadKind[] {
  return scope === "documents" ? ["document"] : scope === "media" ? ["image", "video"] : ["image", "video", "document"];
}

export function attachmentsForScope(value: Attachment[], scope: Exclude<Scope, "all">) {
  return value.filter((attachment) => scope === "documents" ? attachment.type === "document" : attachment.type !== "document");
}

export function replaceAttachmentScope(value: Attachment[], scope: Exclude<Scope, "all">, next: Attachment[]) {
  return [...attachmentsForScope(value, scope === "documents" ? "media" : "documents"), ...next];
}

function fileKey(file: Pick<File, "name" | "size" | "type">) {
  return `${file.name}:${file.size}:${file.type}`.toLowerCase();
}

function attachmentKey(attachment: Attachment) {
  return attachment.name && attachment.size !== undefined
    ? `${attachment.name}:${attachment.size}:${attachment.mimeType ?? ""}`.toLowerCase()
    : attachment.url;
}

function displayName(attachment: Attachment) {
  if (attachment.name) return attachment.name;
  try { return decodeURIComponent(attachment.url.split("/").pop() ?? "Attachment"); } catch { return "Attachment"; }
}

export function AttachmentsField({ value, onChange, scope = "all", title, description }: Props) {
  const { user } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const kinds = allowedKinds(scope);

  async function handleFiles(files: File[]) {
    if (!user || !files.length) return;
    const seen = new Set(value.map(attachmentKey));
    const next = [...value];
    const errors: string[] = [];
    let skipped = 0;
    setUploading(true);
    try {
      for (const file of files) {
        const key = fileKey(file);
        const kind = classifyUploadFile(file);
        if (!kind || !kinds.includes(kind)) {
          errors.push(`${file.name}: unsupported file type for this section`);
          continue;
        }
        try { validateUploadFile(file); } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : "file validation failed"}`);
          continue;
        }
        if (seen.has(key)) { skipped += 1; continue; }
        try {
          const url = await uploadMedia(file, user.id);
          next.push({ url, type: kind, name: file.name, size: file.size, mimeType: file.type || undefined });
          seen.add(key);
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`);
        }
      }
      if (next.length !== value.length) onChange(next);
      if (skipped) toast.info(`${skipped} duplicate file${skipped === 1 ? "" : "s"} skipped`);
      if (errors.length) toast.error(errors.slice(0, 3).join("\n"));
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  const update = (index: number, patch: Partial<Attachment>) => onChange(value.map((attachment, current) => current === index ? { ...attachment, ...patch } : attachment));
  const remove = (index: number) => onChange(value.filter((_, current) => current !== index));

  return (
    <div className="space-y-3">
      {title ? <div><h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>{description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}</div> : null}
      {value.map((attachment, index) => (
        <div key={`${attachment.url}-${index}`} className="flex gap-3 rounded border border-border bg-muted/30 p-2">
          {attachment.type === "image" ? <img src={attachment.url} alt={attachment.caption ?? ""} className="size-16 shrink-0 rounded object-cover" /> : attachment.type === "video" ? <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted"><FileVideo className="size-6 text-muted-foreground" /></div> : <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted"><FileText className="size-6 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="truncate text-xs font-medium" title={displayName(attachment)}>{displayName(attachment)}</p>
            {attachment.size !== undefined ? <p className="text-[11px] text-muted-foreground">{formatUploadSize(attachment.size)}</p> : null}
            {attachment.type !== "document" ? <><Input value={attachment.caption ?? ""} onChange={(event) => update(index, { caption: event.target.value })} placeholder="Caption (optional)" className="h-8 text-xs" /><Input value={attachment.credit ?? ""} onChange={(event) => update(index, { credit: event.target.value })} placeholder="Credit / source (optional)" className="h-8 text-xs" /></> : null}
          </div>
          <button type="button" onClick={() => remove(index)} aria-label={`Remove ${displayName(attachment)}`} className="self-start text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
        </div>
      ))}
      <div className={`rounded-md border border-dashed p-4 text-center transition-colors ${dragActive ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); void handleFiles(Array.from(event.dataTransfer.files)); }} role="region" aria-label={scope === "documents" ? "Document upload" : "Photo and video upload"}>
        <UploadCloud className={`mx-auto size-6 ${dragActive ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
        <p className="mt-1 text-xs font-medium">{dragActive ? "Drop files here" : "Drag files here or choose files"}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{scope === "documents" ? "PDF, DOC, DOCX or TXT · up to 8 MB each" : "Images up to 8 MB · videos up to 50 MB"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {kinds.includes("image") ? <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => imageInputRef.current?.click()}>{uploading ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ImageUp className="mr-1.5 size-4" />}Add photos</Button> : null}
        {kinds.includes("video") ? <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => videoInputRef.current?.click()}><FileVideo className="mr-1.5 size-4" />Add videos</Button> : null}
        {kinds.includes("document") ? <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => documentInputRef.current?.click()}><FileText className="mr-1.5 size-4" />Add documents</Button> : null}
      </div>
      {kinds.includes("image") ? <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))} /> : null}
      {kinds.includes("video") ? <input ref={videoInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))} /> : null}
      {kinds.includes("document") ? <input ref={documentInputRef} type="file" accept="application/pdf,.doc,.docx,text/plain" multiple className="hidden" onChange={(event) => void handleFiles(Array.from(event.target.files ?? []))} /> : null}
    </div>
  );
}
