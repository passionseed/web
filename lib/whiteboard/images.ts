/**
 * Board images: how they are served and fetched.
 *
 * Each image is stored once per board as a data URL, under the id Excalidraw
 * gave it. Saving never overwrites an id (the upsert ignores duplicates), so a
 * file id always means the same bytes and the browser may cache it forever.
 */

/** File ids are Excalidraw's (a hex hash, or a nanoid as a fallback). */
export const FILE_ID = /^[A-Za-z0-9_-]{1,100}$/;

/** How long the browser keeps an image: a year, since an id's bytes never change. */
export const IMAGE_CACHE_CONTROL = "private, max-age=31536000, immutable";

/** Splits a base64 data URL into its type and bytes, or null when it is not one. */
export function parseDataUrl(dataURL: string): { mimeType: string; base64: string } | null {
  const match = /^data:([a-z0-9.+/-]+);base64,/i.exec(dataURL);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), base64: dataURL.slice(match[0].length) };
}

/** The URL one board image is served from. */
export const imageUrl = (boardId: string, fileId: string) =>
  `/api/whiteboards/${boardId}/files/${encodeURIComponent(fileId)}`;

type Placed = { fileId: string; x: number; y: number; width: number; height: number };

/**
 * File ids in the order to fetch them: the images nearest the middle of the
 * view first, so what the person is looking at appears first. Each id once.
 */
export function fetchOrder(images: readonly Placed[], view: { x: number; y: number }): string[] {
  const nearest = new Map<string, number>();
  for (const img of images) {
    const dx = img.x + img.width / 2 - view.x;
    const dy = img.y + img.height / 2 - view.y;
    const d = dx * dx + dy * dy;
    const known = nearest.get(img.fileId);
    if (known === undefined || d < known) nearest.set(img.fileId, d);
  }
  return [...nearest.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
}

/** Images bigger than this (as a data URL) are re-encoded before upload. */
export const COMPRESS_ABOVE = 200_000;

/** Which uploads are worth re-encoding as WebP: big photos and screenshots, never GIFs or SVGs. */
export function shouldCompress(mimeType: string, dataUrlLength: number): boolean {
  return dataUrlLength > COMPRESS_ABOVE && /^image\/(png|jpeg|jpg|webp|bmp)$/i.test(mimeType);
}
