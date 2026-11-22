/**
 * Slip images before upload. Vercel refuses request bodies over 4.5 MB, and
 * some phones save PNG screenshots bigger than that, or hand over a file with
 * no MIME type. Those are re-encoded in the browser as a JPEG small enough to
 * send, still sharp enough for SlipOK to read the slip's QR code.
 */

/** Largest slip the server accepts (under Vercel's 4.5 MB body limit). */
export const MAX_SLIP_BYTES = 4 * 1024 * 1024;

/** Types SlipOK reads that we pass through untouched. */
export const SLIP_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Re-encode anything over this, so the upload stays well under the limit. */
const SHRINK_OVER_BYTES = 3 * 1024 * 1024;

/** Long edge of a re-encoded slip: plenty for the QR code. */
const MAX_EDGE_PX = 2000;

export function slipNeedsShrink(type: string, size: number): boolean {
  return !(SLIP_TYPES as readonly string[]).includes(type) || size > SHRINK_OVER_BYTES;
}

/** Scale (width, height) down so the long edge is at most maxEdge. Never scales up. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = MAX_EDGE_PX,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Return a file ready to upload, or null when the browser can't read it as
 * an image (for example HEIC on a browser that can't decode it).
 */
export async function prepareSlip(file: File): Promise<File | null> {
  if (!slipNeedsShrink(file.type, file.size)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob || blob.size > MAX_SLIP_BYTES) return null;
    return new File([blob], "slip.jpg", { type: "image/jpeg" });
  } catch {
    return null;
  }
}
