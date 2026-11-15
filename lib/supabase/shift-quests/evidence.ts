import "server-only";

import sharp from "sharp";

import type { QuestApi } from "@/bot/src/quests/api";
import { schemaOf } from "@/bot/src/quests/schema";
import { MAX_SIDE, MAX_UPLOAD_BYTES, PHOTO_SCHEMA } from "@/lib/shift-island/photos";
import { createAdminClient } from "@/utils/supabase/admin";

import type { EvidencePhotoView } from "./evidenceTypes";

export { MAX_PHOTOS, MAX_SIDE, MAX_UPLOAD_BYTES, PHOTO_SCHEMA } from "@/lib/shift-island/photos";

/**
 * Photo evidence on a quest submission (schema 14,
 * 20261115130000_shift_quest_evidence_photos). The quest database decides who
 * may add or see a photo and hands out its object path; this module only
 * re-encodes the image and talks to the private Storage bucket with the
 * service role. Nothing here runs at import time: the admin client is made
 * per call, so builds with placeholder env never reach Storage.
 *
 * Students are minors: every photo is decoded and re-encoded to WebP, at most
 * 1600 px on its long side, with no metadata kept (no EXIF, no GPS, no camera
 * or software tags). The original bytes are never stored.
 */

export const EVIDENCE_BUCKET = "shift-quest-evidence";
/** How long a signed photo link works. */
export const SIGNED_URL_SECONDS = 600;

export interface ProcessedPhoto {
  data: Buffer;
  bytes: number;
  width: number;
  height: number;
}

export class PhotoUnreadable extends Error {
  constructor() {
    super("photo_unreadable");
    this.name = "PhotoUnreadable";
  }
}

/**
 * Decodes any image sharp reads, turns it upright from its EXIF orientation,
 * shrinks it to MAX_SIDE, and encodes WebP with no metadata. Throws
 * PhotoUnreadable for anything that is not a readable still image.
 */
export async function processPhoto(input: Buffer): Promise<ProcessedPhoto> {
  try {
    const { data, info } = await sharp(input, { failOn: "error", limitInputPixels: 50_000_000, animated: false })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height || data.length === 0 || data.length > MAX_UPLOAD_BYTES) throw new PhotoUnreadable();
    return { data, bytes: data.length, width: info.width, height: info.height };
  } catch {
    throw new PhotoUnreadable();
  }
}

/** True when the database has the photo functions. A failed read counts as no. */
export async function photosAvailable(api: QuestApi): Promise<boolean> {
  try {
    return (await schemaOf(api)) >= PHOTO_SCHEMA;
  } catch {
    return false;
  }
}

/** Stores a re-encoded photo at the path the database gave. Never overwrites. */
export async function storePhoto(path: string, data: Buffer): Promise<void> {
  const { error } = await createAdminClient()
    .storage.from(EVIDENCE_BUCKET)
    .upload(path, data, { contentType: "image/webp", upsert: false, cacheControl: "3600" });
  if (error) throw new Error("storage_upload_failed");
}

/** Deletes objects; a missing object is not an error. Returns false when Storage refused. */
export async function deletePhotos(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const { error } = await createAdminClient().storage.from(EVIDENCE_BUCKET).remove(paths);
  return !error;
}

/** Short-lived links for paths the database already let the caller see. Missing ones are left out. */
export async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await createAdminClient()
    .storage.from(EVIDENCE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error || !data) return urls;
  for (const row of data) {
    if (row.path && row.signedUrl && !row.error) urls.set(row.path, row.signedUrl);
  }
  return urls;
}

/** One photo as the database lists it: {id, path, width, height}. */
export interface PhotoRow {
  id: string;
  path: string;
  width: number;
  height: number;
}

/** A photo the browser can show. No path: only the signed link. */
export type EvidencePhoto = EvidencePhotoView;

/** The database's photo list, checked: rows with an id and a path only. */
export function photoRows(raw: unknown): PhotoRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const { id, path, width, height } = r as Record<string, unknown>;
    if (typeof id !== "string" || typeof path !== "string") return [];
    return [{ id, path, width: Number(width) || 0, height: Number(height) || 0 }];
  });
}

/** Signs the rows' paths and drops any row Storage could not sign. */
export async function signedPhotos(rows: PhotoRow[]): Promise<EvidencePhoto[]> {
  if (rows.length === 0) return [];
  const urls = await signPhotos(rows.map((r) => r.path));
  return rows.flatMap((r) => {
    const url = urls.get(r.path);
    return url ? [{ id: r.id, url, width: r.width, height: r.height }] : [];
  });
}
