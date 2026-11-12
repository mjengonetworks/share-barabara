export type UploadKind = "image" | "video" | "document";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt"]);
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export function classifyUploadFile(file: Pick<File, "name" | "type">): UploadKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (DOCUMENT_MIME_TYPES.has(file.type) || DOCUMENT_EXTENSIONS.has(extension)) return "document";
  return null;
}

export function validateUploadFile(file: Pick<File, "name" | "type" | "size">): {
  kind: UploadKind;
} {
  const kind = classifyUploadFile(file);
  if (!kind)
    throw new Error("Unsupported file type. Choose an image, video, PDF, DOC, DOCX or TXT file.");
  const max =
    kind === "video" ? MAX_VIDEO_BYTES : kind === "document" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0 || file.size > max) {
    throw new Error(`File too large (maximum ${Math.round(max / 1024 / 1024)}MB)`);
  }
  return { kind };
}

export function formatUploadSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
