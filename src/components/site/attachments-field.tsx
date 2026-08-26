import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileVideo, ImageUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/storage";

export type Attachment = {
  url: string;
  type: "image" | "video";
  caption?: string;
  credit?: string;
};

/** Multiple image/video attachments, uploaded separately from any featured
 *  image or inline content images — used by alerts, and by reports for the
 *  gallery shown at the end of the write-up. */
export function AttachmentsField({
  value,
  onChange,
}: {
  value: Attachment[];
  onChange: (next: Attachment[]) => void;
}) {
  const { user } = useAuth();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined, type: "image" | "video") {
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id);
      onChange([...value, { url, type }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  const update = (i: number, patch: Partial<Attachment>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {value.map((a, i) => (
        <div key={a.url} className="flex gap-3 rounded border border-border bg-muted/30 p-2">
          {a.type === "image" ? (
            <img src={a.url} alt="" className="size-16 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
              <FileVideo className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 space-y-1.5">
            <Input
              value={a.caption ?? ""}
              onChange={(e) => update(i, { caption: e.target.value })}
              placeholder="Caption (optional)"
              className="h-8 text-xs"
            />
            <Input
              value={a.credit ?? ""}
              onChange={(e) => update(i, { credit: e.target.value })}
              placeholder="Credit / source (optional)"
              className="h-8 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Remove attachment"
            className="self-start text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <ImageUp className="mr-1.5 size-4" />
          )}
          Add image
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => videoInputRef.current?.click()}
        >
          <FileVideo className="mr-1.5 size-4" /> Add video
        </Button>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0], "image")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0], "video")}
      />
    </div>
  );
}
