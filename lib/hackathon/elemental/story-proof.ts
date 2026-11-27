import { MAX_SLIP_BYTES } from "./slip-image";

/**
 * Instagram Story proof (Big, 2026-11-27): a student posts their poster as an
 * Instagram Story and uploads a screenshot showing 200+ views. That unlocks
 * every team-name style for their team at once, with no staff check, since
 * it's only cosmetic. Staff can spot-check and revoke; every file and row is
 * deleted after Demo Day (scripts/delete-story-proofs.mjs).
 *
 * Pure and safe to import in the browser; the database side is
 * lib/supabase/hackathon-story-proofs.ts.
 */

/** Views the screenshot must show. Staff read it by eye; the server can't. */
export const STORY_PROOF_MIN_VIEWS = 200;

/** The private storage bucket (supabase/migrations/20261127120000_hackathon_story_proofs.sql). */
export const STORY_PROOF_BUCKET = "hackathon-story-proofs";

/** Largest screenshot accepted: the same as a payment slip (under Vercel's 4.5 MB body limit). */
export const MAX_STORY_PROOF_BYTES = MAX_SLIP_BYTES;

/** The types the slip upload takes, and the extension each is stored with. HEIC is re-encoded in the browser first (prepareSlip). */
export const STORY_PROOF_TYPES: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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

export type RevokeOutcome = "revoked" | "already_revoked" | "not_found";

/** What a staff revoke does to a proof: revokes a live one; a revoked one stays as it is. */
export function revokeOutcome(row: Pick<StoryProofRow, "revokedAt"> | null | undefined): RevokeOutcome {
  if (!row) return "not_found";
  return row.revokedAt ? "already_revoked" : "revoked";
}
