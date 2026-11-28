import { MAX_SLIP_BYTES } from "./slip-image";

/**
 * Instagram Story proof (Big, 2026-11-27): a student posts their poster as an
 * Instagram Story and uploads a screenshot showing 200+ views. That unlocks
 * every team-name style for their team at once, with no staff check, since
 * it's only cosmetic. Staff can spot-check and revoke, which deletes the
 * file straight away; every remaining file and row is deleted after Demo Day
 * (scripts/delete-story-proofs.mjs).
 *
 * Pure and safe to import in the browser; the database side is
 * lib/supabase/hackathon-story-proofs.ts.
 */

/** Views the screenshot must show. Staff read it by eye; the server can't. */
export const STORY_PROOF_MIN_VIEWS = 200;

/** The private storage bucket (supabase/migrations/20261128130000_hackathon_story_proofs.sql). */
export const STORY_PROOF_BUCKET = "hackathon-story-proofs";

/** Largest screenshot accepted: the same as a payment slip (under Vercel's 4.5 MB body limit). */
export const MAX_STORY_PROOF_BYTES = MAX_SLIP_BYTES;

/** The types the slip upload takes, and the extension each is stored with. HEIC is re-encoded in the browser first (prepareSlip). */
export const STORY_PROOF_TYPES: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type StoryProofImageType = "image/jpeg" | "image/png" | "image/webp";

/** How many of the file's first bytes sniffStoryProofType needs. */
export const STORY_PROOF_SNIFF_BYTES = 12;

const startsWith = (head: Uint8Array, bytes: readonly number[], at = 0) => head.length >= at + bytes.length && bytes.every((b, i) => head[at + i] === b);
const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

/**
 * What the file's first bytes say it is: JPEG (FF D8 FF), PNG (89 "PNG" 0D 0A
 * 1A 0A) or WEBP ("RIFF" <size> "WEBP"); null for anything else. The browser's
 * reported type is only a label, so the upload checks this too.
 */
export function sniffStoryProofType(head: Uint8Array): StoryProofImageType | null {
  if (startsWith(head, JPEG)) return "image/jpeg";
  if (startsWith(head, PNG)) return "image/png";
  if (startsWith(head, RIFF) && startsWith(head, WEBP, 8)) return "image/webp";
  return null;
}

/**
 * The type a proof is stored as, from its first bytes: they win over the
 * label (a PNG labelled image/jpeg is stored as the PNG it is). Anything that
 * isn't a JPEG, PNG or WEBP is refused as "file_type".
 */
export function checkStoryProofBytes(head: Uint8Array): { ok: true; ext: string; contentType: StoryProofImageType } | { ok: false; error: "file_type" } {
  const contentType = sniffStoryProofType(head);
  if (!contentType) return { ok: false, error: "file_type" };
  return { ok: true, ext: STORY_PROOF_TYPES[contentType], contentType };
}

/** Per hour: uploads per sign-up, and per network (a school's wifi can hold a few students). */
export const STORY_PROOF_LIMITS = { registration: 10, ip: 30 } as const;

/**
 * A sign-up's own proof, as its share page shows it:
 * - "none": never uploaded;
 * - "unlocked": a live proof, so the team's styles are all open;
 * - "revoked": staff took the last one back. A new upload replaces it.
 */
export type StoryProofStatus = "none" | "unlocked" | "revoked";

export type StoryProofFileError = "no_file" | "file_type" | "file_size";

/** Whether an uploaded file can be a proof, and the extension to store it with. */
export function checkStoryProofFile(
  file: { type: string; size: number } | null | undefined,
): { ok: true; ext: string } | { ok: false; error: StoryProofFileError } {
  if (!file) return { ok: false, error: "no_file" };
  const ext = STORY_PROOF_TYPES[file.type];
  if (!ext) return { ok: false, error: "file_type" };
  if (file.size <= 0 || file.size > MAX_STORY_PROOF_BYTES) return { ok: false, error: "file_size" };
  return { ok: true, ext };
}

export type StoryProofBlock = "closed" | "cancelled";

/** Why a sign-up can't upload a proof now: sharing is closed (shareOpen() false), or the sign-up was cancelled. */
export function storyProofUploadBlock(input: { shareOpen: boolean; registrationStatus: string }): StoryProofBlock | null {
  if (!input.shareOpen) return "closed";
  if (input.registrationStatus === "cancelled") return "cancelled";
  return null;
}

const RANDOM_RE = /^[0-9a-f]{12}$/;

/**
 * Where a proof is stored: <event>/<registration id>/<upload ms>-<12 hex>.<ext>.
 * Everything for an event sits under one folder, so the cleanup script can
 * empty it, files a replaced upload left behind included.
 */
export function storyProofPath(eventSlug: string, registrationId: string, ext: string, nowMs: number, random: string): string {
  if (!RANDOM_RE.test(random)) throw new Error("storyProofPath: random must be 12 hex characters");
  return `${eventSlug}/${registrationId}/${nowMs}-${random}.${ext}`;
}

/** A stored proof row, as the rules need it. */
export type StoryProofRow = { registrationId: string; storagePath: string; revokedAt: string | null };

/** A sign-up's status from its proof row (one per sign-up), or none. */
export function storyProofStatusOf(row: Pick<StoryProofRow, "revokedAt"> | null | undefined): StoryProofStatus {
  if (!row) return "none";
  return row.revokedAt ? "revoked" : "unlocked";
}

/**
 * The old file a new upload replaces, to delete once the new row is saved:
 * the previous upload's file, live or revoked. Null when there was none.
 */
export function replacedProofPath(current: Pick<StoryProofRow, "storagePath"> | null | undefined, nextPath: string): string | null {
  if (!current?.storagePath || current.storagePath === nextPath) return null;
  return current.storagePath;
}

/** The row a new upload writes: the new file, live again (a revoked proof comes back with a fresh screenshot). */
export function storyProofUpsert(input: { eventSlug: string; registrationId: string; storagePath: string; uploadedAt: string }) {
  return {
    event_slug: input.eventSlug,
    registration_id: input.registrationId,
    storage_path: input.storagePath,
    uploaded_at: input.uploadedAt,
    revoked_at: null,
    revoked_by: null,
  };
}

/** Whether any of these sign-ups (a team's members) has a live proof. */
export function anyLiveProof(rows: readonly Pick<StoryProofRow, "registrationId" | "revokedAt">[], registrationIds: readonly string[]): boolean {
  const ids = new Set(registrationIds);
  return rows.some((r) => ids.has(r.registrationId) && !r.revokedAt);
}

/**
 * What staff revoking a proof ends as: revoked; already revoked; gone; or
 * "changed" when the student uploaded a new screenshot in the same moment
 * (staff haven't seen that one, so it stays live for them to check).
 */
export type RevokeOutcome = "revoked" | "already_revoked" | "not_found" | "changed";

/**
 * What a staff revoke does (a screenshot with other students' names on it, or
 * an image that shouldn't be there, must not stay stored):
 * - a live proof: delete its file first, then mark the row revoked. If the
 *   delete fails, the proof stays live and staff press Revoke again;
 * - a revoked proof: delete its file again (harmless if it's gone already);
 * - no row: nothing.
 */
export function revokePlan(
  row: Pick<StoryProofRow, "storagePath" | "revokedAt"> | null | undefined,
): { outcome: "not_found"; deletePath: null } | { outcome: "revoke" | "already_revoked"; deletePath: string } {
  if (!row) return { outcome: "not_found", deletePath: null };
  return { outcome: row.revokedAt ? "already_revoked" : "revoke", deletePath: row.storagePath };
}

/** Whether staff can still see a proof's screenshot: a revoked proof's file is deleted. */
export const proofHasImage = (row: Pick<StoryProofRow, "revokedAt">): boolean => !row.revokedAt;
