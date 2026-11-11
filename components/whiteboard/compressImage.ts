import { shouldCompress } from "@/lib/whiteboard/images";

/** Longest side kept. Excalidraw already caps pasted images at 1440px; this is a ceiling for anything else. */
const MAX_SIDE = 1600;
const QUALITY = 0.82;

/**
 * Re-encodes a big pasted photo or screenshot as WebP before upload, so
 * everyone else downloads a fraction of it (a 2 MB PNG screenshot is usually
 * 150 to 300 KB). Keeps the original whenever WebP is not smaller, the browser
 * cannot encode WebP, or anything fails.
 */
export async function compressForUpload(file: { mimeType: string; dataURL: string }): Promise<{ mimeType: string; dataURL: string }> {
  if (!shouldCompress(file.mimeType, file.dataURL.length) || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(await (await fetch(file.dataURL)).blob());
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
    // Safari before 17 falls back to PNG, which would be no smaller.
    if (!blob || blob.type !== "image/webp") return file;
    const dataURL = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return dataURL.length < file.dataURL.length ? { mimeType: "image/webp", dataURL } : file;
  } catch {
    return file;
  }
}
