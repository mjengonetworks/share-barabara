import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImageUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { uploadMedia } from "@/lib/storage";

/** Single-image upload with a preview, replacing a plain URL text field.
 *  Uploads directly to Supabase Storage and reports back the public URL. */
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

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, user.id);
      onChange(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt=""
            className="aspect-video w-full max-w-xs rounded-md object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove image"
            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" />
          ) : (
            <ImageUp className="mr-1.5 size-4" />
          )}
          {uploading ? "Uploading…" : label}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
