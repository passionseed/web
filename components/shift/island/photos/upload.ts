"use client";

import { uploadEvidencePhoto } from "@/app/shift/island/evidence-actions";
import { PhotoPickError, shrinkPhoto, type ShrunkPhoto } from "@/lib/shift-island/photos";

/** A photo picked in the browser, already shrunk, with a local preview link. */
export interface PickedPhoto {
  key: string;
  blob: Blob;
  preview: string;
  width: number;
  height: number;
}

let next = 0;

/** Shrinks one pick into a PickedPhoto; throws PhotoPickError ("too_big" | "unreadable"). */
export async function pickPhoto(file: File): Promise<PickedPhoto> {
  const shrunk: ShrunkPhoto = await shrinkPhoto(file);
  next += 1;
  return { key: `photo-${next}`, blob: shrunk.blob, preview: URL.createObjectURL(shrunk.blob), width: shrunk.width, height: shrunk.height };
}

/** Lets go of a pick's preview link. */
export function dropPhoto(photo: PickedPhoto): void {
  URL.revokeObjectURL(photo.preview);
}

/**
 * Uploads picks one after another to a submission that waits for a mentor
 * (the database refuses anything else). Calls onProgress after each, and
 * answers how many went up and the first refusal's Thai words, if any.
 */
export async function uploadPhotos(
  submissionId: string,
  photos: PickedPhoto[],
  onProgress?: (done: number) => void,
): Promise<{ sent: number; failed: number; error: string | null }> {
  let sent = 0;
  let error: string | null = null;
  for (const [index, photo] of photos.entries()) {
    const form = new FormData();
    form.set("submissionId", submissionId);
    form.set("photo", photo.blob, "photo.jpg");
    const result = await uploadEvidencePhoto(form).catch(() => null);
    if (result?.ok) sent += 1;
    else error ??= result && !result.ok ? result.error : null;
    onProgress?.(index + 1);
  }
  return { sent, failed: photos.length - sent, error };
}

export { PhotoPickError };
