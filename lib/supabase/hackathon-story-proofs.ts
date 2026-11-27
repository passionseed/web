import "server-only";

import { randomBytes } from "crypto";

import { shareCode } from "@/lib/hackathon/elemental/share";
import {
  anyLiveProof,
  replacedProofPath,
  revokeOutcome,
  STORY_PROOF_BUCKET,
  storyProofPath,
  storyProofStatusOf,
  storyProofUpsert,
  type RevokeOutcome,
  type StoryProofStatus,
} from "@/lib/hackathon/elemental/story-proof";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Instagram Story proofs (hackathon_story_proofs, the private
 * hackathon-story-proofs bucket; rules in lib/hackathon/elemental/story-proof.ts).
 * Service role only: the share page holds a pay token, the admin page calls
 * requireAdmin() first. One row per sign-up; a new upload replaces the file.
 * The image is never returned on a public route: staff see it through a
 * short-lived signed URL.
 *
 * Before the 20261127120000 migration is applied the table and bucket don't
 * exist: the readers never throw (none / false), and an upload fails with a
 * server error the route turns into a 500.
 */

/** How long an admin thumbnail link works. */
const SIGNED_URL_SECONDS = 10 * 60;

type ProofDbRow = {
  id: string;
  registration_id: string;
  storage_path: string;
  uploaded_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
};

const PROOF_COLUMNS = "id, registration_id, storage_path, uploaded_at, revoked_at, revoked_by";

async function proofRow(registrationId: string): Promise<ProofDbRow | null> {
  const { data, error } = await createAdminClient()
    .from("hackathon_story_proofs")
    .select(PROOF_COLUMNS)
    .eq("registration_id", registrationId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProofDbRow | null) ?? null;
}

/** A sign-up's own proof: none, unlocked or revoked. Never throws: on any error (no table yet) it's "none". */
export async function storyProofStatus(registrationId: string): Promise<StoryProofStatus> {
  try {
    const row = await proofRow(registrationId);
    return storyProofStatusOf(row ? { revokedAt: row.revoked_at } : null);
  } catch (error) {
    console.error("[elemental story proof] status unavailable", error);
    return "none";
  }
}

/**
 * Whether any of these sign-ups (a team's members, or a solo sign-up alone)
 * has a live proof for the event: the "unlock every style" rule. Never
 * throws: on any error (no table yet) it's false, so nothing unlocks by mistake.
 */
export async function teamHasStoryProof(eventSlug: string, registrationIds: string[]): Promise<boolean> {
  const ids = [...new Set(registrationIds.filter(Boolean))];
  if (ids.length === 0) return false;
  try {
    const { data, error } = await createAdminClient()
      .from("hackathon_story_proofs")
      .select("registration_id, revoked_at")
      .eq("event_slug", eventSlug)
      .in("registration_id", ids)
      .is("revoked_at", null)
      .limit(1);
    if (error) throw error;
    return anyLiveProof(
      (data ?? []).map((r) => ({ registrationId: r.registration_id as string, revokedAt: (r.revoked_at as string | null) ?? null })),
      ids,
    );
  } catch (error) {
    console.error("[elemental story proof] team check unavailable", error);
    return false;
  }
}

/**
 * Store a new proof for a sign-up: upload the file, point the sign-up's one
 * row at it (live again if it was revoked), then delete the file it
 * replaced. Two uploads at once both land; the last row wins and the other
 * file is left for the cleanup script, which empties the event's folder.
 */
export async function saveStoryProof(eventSlug: string, registrationId: string, file: File, ext: string): Promise<void> {
  const db = createAdminClient();
  const current = await proofRow(registrationId);
  const path = storyProofPath(eventSlug, registrationId, ext, Date.now(), randomBytes(6).toString("hex"));

  const { error: uploadError } = await db.storage.from(STORY_PROOF_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { error } = await db
    .from("hackathon_story_proofs")
    .upsert(storyProofUpsert({ eventSlug, registrationId, storagePath: path, uploadedAt: new Date().toISOString() }), { onConflict: "registration_id" });
  if (error) {
    // The row didn't save: don't leave the new file behind.
    await db.storage.from(STORY_PROOF_BUCKET).remove([path]).catch(() => undefined);
    throw error;
  }

  const old = replacedProofPath(current ? { storagePath: current.storage_path } : null, path);
  if (old) {
    const { error: removeError } = await db.storage.from(STORY_PROOF_BUCKET).remove([old]);
    // The new proof is saved; a leftover file only waits for the cleanup script.
    if (removeError) console.error("[elemental story proof] could not delete the replaced file", removeError);
  }
}

/** Staff take a proof back: the team's styles go back to what its devices unlock. The file stays until the cleanup after Demo Day. */
export async function revokeStoryProof(id: string, adminUserId: string): Promise<RevokeOutcome> {
  const db = createAdminClient();
  const { data, error } = await db.from("hackathon_story_proofs").select("id, revoked_at").eq("id", id).maybeSingle();
  if (error) throw error;
  const outcome = revokeOutcome(data ? { revokedAt: (data.revoked_at as string | null) ?? null } : null);
  if (outcome !== "revoked") return outcome;
  const now = new Date().toISOString();
  const { data: done, error: updateError } = await db
    .from("hackathon_story_proofs")
    .update({ revoked_at: now, revoked_by: `admin:${adminUserId}` })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id");
  if (updateError) throw updateError;
  // Another staff member revoked it a moment ago.
  return done && done.length > 0 ? "revoked" : "already_revoked";
}

/** A proof as the admin page shows it (staff only). */
export type AdminStoryProof = {
  id: string;
  registrationId: string;
  /** The sign-up's code (first 8 hex of its id). */
  code: string;
  uploadedAt: string;
  revokedAt: string | null;
  revokedBy: string | null;
  /** Works for SIGNED_URL_SECONDS; null if signing failed or the file is gone. */
  imageUrl: string | null;
};

/** Every proof of the event, newest first, each with a short-lived signed thumbnail URL. */
export async function listStoryProofsForAdmin(eventSlug: string): Promise<AdminStoryProof[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_story_proofs")
    .select(PROOF_COLUMNS)
    .eq("event_slug", eventSlug)
    .order("uploaded_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  const rows = (data ?? []) as ProofDbRow[];
  const signed = new Map<string, string>();
  if (rows.length > 0) {
    const { data: urls, error: signError } = await db.storage.from(STORY_PROOF_BUCKET).createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGNED_URL_SECONDS,
    );
    if (signError) console.error("[admin story proofs] could not sign thumbnails", signError);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  return rows.map((r) => ({
    id: r.id,
    registrationId: r.registration_id,
    code: shareCode(r.registration_id),
    uploadedAt: r.uploaded_at,
    revokedAt: r.revoked_at,
    revokedBy: r.revoked_by,
    imageUrl: signed.get(r.storage_path) ?? null,
  }));
}
