import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageUp, Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/storage";
import { validateUploadFile } from "@/lib/upload-validation";

/** Single featured-image upload with click and drag/drop support. */
export function ImageUploadField({
  value,
  onChange,
  label = "Upload image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;
    try {
      const validation = validateUploadFile(file);
      if (validation.kind !== "image") throw new Error("Featured Image accepts image files only.");
      setUploading(true);
      onChange(await uploadMedia(file, user.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className={`rounded-md border border-dashed p-3 transition-colors ${dragActive ? "border-primary bg-primary/10" : "border-border bg-muted/20"}`}
      onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => { event.preventDefault(); setDragActive(false); void handleFile(event.dataTransfer.files[0]); }}
      role="region"
      aria-label="Featured image upload"
    >
      {value ? <div className="relative inline-block rounded-md bg-muted/40 p-1"><img src={value} alt="" className="max-h-64 w-auto max-w-full rounded-md object-contain" /><button type="button" onClick={() => onChange("")} aria-label="Remove featured image" className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow"><X className="size-3.5" /></button><Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="absolute bottom-2 left-2 shadow">{uploading ? "Uploading…" : "Replace image"}</Button></div> : <div className="text-center"><UploadCloud className={`mx-auto size-6 ${dragActive ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" /><p className="mt-1 text-xs font-medium">{dragActive ? "Drop image here" : "Drag an image here or choose one"}</p><Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()} className="mt-2">{uploading ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <ImageUp className="mr-1.5 size-4" />}{uploading ? "Uploading…" : label}</Button></div>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
    </div>
  );
}
