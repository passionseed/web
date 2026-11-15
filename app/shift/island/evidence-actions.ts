"use server";

/**
 * Photo evidence and the team's problem on /shift/island (schema 14,
 * 20261115130000_shift_quest_evidence_photos). Each action re-derives who is
 * asking from the session through the shared gate (./gate.ts; the client
 * never sends an actor) and lets the quest database decide: whose
 * submission, which state, how many photos, who may see them. This file only
 * re-encodes images (lib/supabase/shift-quests/evidence.ts: WebP, 1600 px,
 * no EXIF or GPS) and moves them in and out of the private bucket with the
 * service role, after the database said yes. Logs carry codes only, never a
 * file name or anything a student wrote.
 *
 * Uploads and reads never refresh the page (a sheet is open over it); the
 * problem line does, so the tree and the quest pages show the new line.
 */

import { QuestError } from "@/bot/src/quests/api";
import { questApi } from "@/lib/supabase/shift-quests/db";
import {
  MAX_UPLOAD_BYTES,
  deletePhotos,
  photoRows,
  photosAvailable,
  processPhoto,
  signedPhotos,
  storePhoto,
  type EvidencePhoto,
} from "@/lib/supabase/shift-quests/evidence";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";
import {
  loadPhotosSchema,
  removePhotoSchema,
  setTeamProblemSchema,
  uploadPhotoSchema,
} from "@/lib/supabase/shift-quests/validate";

import { errorName, withReader, withReadyViewer } from "./gate";

export interface QuestPhotos {
  submissionId: string;
  revision: number;
  /** The submission's status: photos can be added or taken back only while it is "pending". */
  status: string;
  photos: EvidencePhoto[];
}

/**
 * One photo onto the caller's own submission, which must still wait for a
 * mentor. FormData: submissionId, photo (the browser has already shrunk it).
 * The database reserves the path first, so nothing reaches Storage before it
 * says yes; when the upload then fails, the reservation is taken back.
 */
export async function uploadEvidencePhoto(form: FormData): Promise<IslandActionResult<{ id: string; count: number }>> {
  const photo = form.get("photo");
  return withReader("uploadEvidencePhoto", uploadPhotoSchema, { submissionId: form.get("submissionId") }, async ({ actor }, v) => {
    if (!(photo instanceof Blob) || photo.size === 0) throw new QuestError("photo_unreadable");
    if (photo.size > MAX_UPLOAD_BYTES) throw new QuestError("photo_too_big");
    const api = questApi();
    if (!(await photosAvailable(api))) throw new QuestError("feature_unavailable");

    const image = await processPhoto(Buffer.from(await photo.arrayBuffer())).catch(() => {
      throw new QuestError("photo_unreadable");
    });
    const slot = await api.call<{ id: string; path: string; count: number }>(
      "shift_quest_evidence_add", actor, v.submissionId, image.bytes, image.width, image.height,
    );
    try {
      await storePhoto(slot.path, image.data);
    } catch (error) {
      console.error(`[shift-island] uploadEvidencePhoto: storage upload failed (${errorName(error)})`);
      await api.call("shift_quest_evidence_remove", actor, slot.id).catch((undo: unknown) => {
        console.error(`[shift-island] uploadEvidencePhoto: undo failed (${errorName(undo)})`);
      });
      throw new QuestError("photo_upload_failed");
    }
    return { id: slot.id, count: Number(slot.count) || 0 };
  });
}

/** Takes one of the caller's photos back while a mentor has not decided. The object goes at once (and is queued anyway). */
export async function removeEvidencePhoto(input: { photoId: string }): Promise<IslandActionResult> {
  return withReader("removeEvidencePhoto", removePhotoSchema, input, async ({ actor }, v) => {
    const api = questApi();
    if (!(await photosAvailable(api))) throw new QuestError("feature_unavailable");
    const gone = await api.call<{ path: string }>("shift_quest_evidence_remove", actor, v.photoId);
    // The database queued the object; the daily job deletes it if this fails.
    if (!(await deletePhotos([gone.path]).catch(() => false))) {
      console.error("[shift-island] removeEvidencePhoto: storage delete deferred to the daily job");
    }
    return null;
  });
}

/**
 * The photos of one quest's latest submission, as short-lived links, for
 * someone the database lets see them; null when there are none to show
 * (no submission, not allowed, or a database before schema 14).
 */
export async function loadEvidencePhotos(input: { instanceId: string }): Promise<IslandActionResult<QuestPhotos | null>> {
  return withReader("loadEvidencePhotos", loadPhotosSchema, input, async ({ actor }, v) => {
    const api = questApi();
    if (!(await photosAvailable(api))) return null;
    const raw = await api.call<Record<string, unknown> | null>("shift_quest_evidence_list", actor, v.instanceId);
    if (!raw || typeof raw.submission_id !== "string") return null;
    return {
      submissionId: raw.submission_id,
      revision: Number(raw.revision) || 0,
      status: typeof raw.status === "string" ? raw.status : "",
      photos: await signedPhotos(photoRows(raw.photos)),
    };
  });
}

/** ปัญหาที่ทีมเลือก, changed by any teammate. Changing it is normal: talking to real people sharpens it. */
export async function setTeamProblem(input: { projectId: string; ambition: string }): Promise<IslandActionResult<{ ambition: string }>> {
  return withReadyViewer("setTeamProblem", setTeamProblemSchema, input, async ({ actor }, v) => {
    const api = questApi();
    if (!(await photosAvailable(api))) throw new QuestError("feature_unavailable");
    const row = await api.call<{ ambition: string }>("shift_quest_project_set_ambition", actor, v.projectId, v.ambition);
    return { ambition: typeof row?.ambition === "string" ? row.ambition : v.ambition };
  });
}
