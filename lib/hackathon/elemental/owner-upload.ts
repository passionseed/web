/**
 * What a problem owner may upload from the owner kit, and where it lands in
 * the bucket. Pure functions, shared by the API route and its tests.
 */

/** Phone videos run large: a minute of 4K is often 300 to 400 MB. */
export const OWNER_UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024;

/** MIME type to file extension. Phones send .mov as video/quicktime. */
const TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/webm": "webm",
  "video/3gpp": "3gp",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/** Some browsers leave the type empty for .heic and .mov, so fall back to the extension. */
const BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  "3gp": "video/3gpp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

/** The `accept` attribute for the file picker. */
export const OWNER_UPLOAD_ACCEPT = "video/*,image/*,application/pdf,.mov,.heic,.heif";

export function ownerUploadContentType(fileName: string, fileType: string | undefined): string | null {
  if (fileType && TYPES[fileType]) return fileType;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[ext] ?? null;
}

export type OwnerUploadCheck =
  | { ok: true; contentType: string; extension: string }
  | { ok: false; error: string };

export function checkOwnerUpload(input: { fileName: unknown; fileType: unknown; fileSize: unknown }): OwnerUploadCheck {
  const { fileName, fileType, fileSize } = input;
  if (typeof fileName !== "string" || fileName.trim().length === 0 || fileName.length > 255) {
    return { ok: false, error: "ชื่อไฟล์ไม่ถูกต้อง" };
  }
  if (typeof fileSize !== "number" || !Number.isSafeInteger(fileSize) || fileSize <= 0) {
    return { ok: false, error: "ไฟล์ว่างหรืออ่านขนาดไม่ได้" };
  }
  if (fileSize > OWNER_UPLOAD_MAX_BYTES) {
    return { ok: false, error: "ไฟล์ใหญ่เกิน 2 GB" };
  }
  const contentType = ownerUploadContentType(fileName, typeof fileType === "string" ? fileType : undefined);
  if (!contentType) {
    return { ok: false, error: "รับเฉพาะคลิป รูป และ PDF" };
  }
  return { ok: true, contentType, extension: TYPES[contentType] };
}

/**
 * elemental-owners/<org>/<YYYY-MM-DD>/<time>_<random>_<name>.<ext>
 * The random part keeps URLs unguessable (the bucket is public); the original
 * name, cut to ASCII, helps the team tell files apart.
 */
export function ownerUploadKey(
  org: string,
  fileName: string,
  extension: string,
  now = new Date(),
  random = Math.random().toString(36).slice(2, 12)
): string {
  const base = fileName.replace(/\.[^.]*$/, "");
  const safe = base.replace(/[^a-zA-Z0-9-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "file";
  const day = now.toISOString().slice(0, 10);
  return `elemental-owners/${org}/${day}/${now.getTime()}_${random}_${safe}.${extension}`;
}
