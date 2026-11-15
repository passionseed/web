/**
 * Photo evidence limits, shared by the browser and the server
 * (lib/supabase/shift-quests/evidence.ts), and the browser's shrink step.
 *
 * The browser shrinks every pick before it uploads (a phone photo is often
 * 3 to 8 MB and Vercel takes 4.5 MB per request): it draws the image upright
 * on a canvas at most MAX_SIDE px on its long side and encodes JPEG, which
 * also drops the file's EXIF and GPS. The server decodes and re-encodes it
 * again and keeps no metadata, so it never trusts this step. iPhones convert
 * HEIC photos to JPEG for the picker (ACCEPT).
 */

/** The quest schema with photo evidence and the problem line's change (20261115130000). */
export const PHOTO_SCHEMA = 14;
export const MAX_PHOTOS = 3;
/** What a student may pick before the browser shrinks it. */
export const MAX_PICK_BYTES = 8 * 1024 * 1024;
/** What the browser may send per photo after shrinking (the bucket's cap too). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/** The long side after shrinking, in the browser and on the server. */
export const MAX_SIDE = 1600;
/**
 * The file picker's types: any image. An iPhone turns HEIC photos into JPEG
 * for a page that does not list HEIC, and the browser shrink step re-encodes
 * whatever it can open (a HEIC file a browser cannot open gets the
 * "unreadable" words: take a screenshot instead).
 */
export const ACCEPT = "image/*";

export type PhotoProblem = "too_big" | "unreadable";

export class PhotoPickError extends Error {
  constructor(public readonly problem: PhotoProblem) {
    super(problem);
    this.name = "PhotoPickError";
  }
}

export interface ShrunkPhoto {
  blob: Blob;
  width: number;
  height: number;
}

/** The size a picture takes when its long side is at most MAX_SIDE. */
export function fitInside(width: number, height: number, max: number = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Browser only: one picked file, upright, shrunk to MAX_SIDE and re-encoded as
 * JPEG (no metadata). Throws PhotoPickError("too_big") for a pick over
 * MAX_PICK_BYTES or a result still over MAX_UPLOAD_BYTES, and ("unreadable")
 * for anything the browser cannot open as a picture.
 */
export async function shrinkPhoto(file: File): Promise<ShrunkPhoto> {
  if (file.size > MAX_PICK_BYTES) throw new PhotoPickError("too_big");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoPickError("unreadable");
  }
  const size = fitInside(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new PhotoPickError("unreadable");
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await encode(canvas, quality);
    if (!blob) throw new PhotoPickError("unreadable");
    if (blob.size <= MAX_UPLOAD_BYTES) return { blob, width: size.width, height: size.height };
  }
  throw new PhotoPickError("too_big");
}
