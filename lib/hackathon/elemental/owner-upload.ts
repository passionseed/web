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
  // The owner's typed note (names, titles, links), sent as notes.txt.
  "text/plain": "txt",
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
  txt: "text/plain",
};

/** A typed note is a few lines; anything bigger isn't one. */
export const OWNER_NOTE_MAX_BYTES = 1024 * 1024;

/**
 * The `accept` attributes for the two file pickers. Media and PDF are split
 * because mixing application/pdf in sends many Android phones to a generic
 * Files picker instead of the gallery, where the clip is.
 */
export const OWNER_UPLOAD_ACCEPT_MEDIA = "video/*,image/*,.mov,.heic,.heif";
export const OWNER_UPLOAD_ACCEPT_PDF = "application/pdf,.pdf";

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
  if (contentType === "text/plain" && fileSize > OWNER_NOTE_MAX_BYTES) {
    return { ok: false, error: "ข้อความยาวเกินไป" };
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

/** A key this org's link may report: one ownerUploadKey made for this org. */
export function isOwnerUploadKey(org: string, key: unknown): key is string {
  if (typeof key !== "string" || key.length > 300) return false;
  const prefix = `elemental-owners/${org}/`;
  return key.startsWith(prefix) && /^\d{4}-\d{2}-\d{2}\/\d+_[a-z0-9]+_[A-Za-z0-9_-]+\.[a-z0-9]+$/.test(key.slice(prefix.length));
}

/** "1.2 GB" or "340.5 MB", for the upload list and the team ping. */
export function formatFileSize(bytes: number): string {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(0.1, bytes / 1024 ** 2).toFixed(1)} MB`;
}

/** The file's own name, without the folder, time and random parts. */
const shortName = (key: string) => key.split("/").pop()!.replace(/^\d+_[a-z0-9]+_/, "");

/** Discord caps a message at 2000 characters, so list at most this many files. */
const LISTED = 12;

/**
 * The team's Discord ping when an owner finishes uploading a batch: who sent
 * what, with links to open each file.
 */
export function ownerUploadsMessage(input: {
  org: string;
  element: string | null;
  files: { key: string; size: number; url: string }[];
  /** The owner ticked "students' faces are in it and guardians gave written permission". */
  minorsWithPermission?: boolean;
}): string {
  const { org, element, files, minorsWithPermission } = input;
  const total = files.reduce((sum, f) => sum + f.size, 0);
  const who = element ? `**${org}** (${element})` : `**${org}**`;
  const lines = files.slice(0, LISTED).map((f) => `- [${shortName(f.key)}](<${f.url}>) ${formatFileSize(f.size)}`);
  if (files.length > LISTED) lines.push(`- and ${files.length - LISTED} more`);
  return [
    `📥 ${who} uploaded ${files.length} file${files.length === 1 ? "" : "s"} (${formatFileSize(total)})`,
    ...lines,
    ...(minorsWithPermission
      ? ["⚠️ Owner says students' faces are in this footage and guardians gave written permission. Find the permission form before posting."]
      : []),
    `All files: \`pnpm elemental:owner-kit list ${org}\``,
  ].join("\n");
}
