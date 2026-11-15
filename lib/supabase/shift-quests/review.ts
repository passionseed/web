import "server-only";

import { QuestError } from "@/bot/src/quests/api";

import { questApi } from "./db";
import { photoRows, photosAvailable, signedPhotos, type EvidencePhoto } from "./evidence";

/** One submission as the web review page shows it (shift_quest_review_view, schema 14). */
export interface ReviewView {
  submissionId: string;
  instanceId: string;
  revision: number;
  status: string;
  isLatest: boolean;
  title: string;
  goal: string;
  criteria: string;
  evidence: string | null;
  reflection: string | null;
  artifactUrl: string | null;
  redacted: boolean;
  photos: EvidencePhoto[];
}

export type ReviewRead =
  | { state: "ok"; view: ReviewView }
  | { state: "not_authorized" }
  | { state: "not_found" }
  | { state: "unavailable" };

const text = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/**
 * The web review page's read, for a reviewer or admin. The database refuses
 * everyone else ('not_authorized'); photos come back as short-lived links.
 * Never throws: a database before schema 14 or any failure is 'unavailable'
 * (logged by code only).
 */
export async function loadReview(actor: string, submissionId: string): Promise<ReviewRead> {
  const api = questApi();
  try {
    if (!(await photosAvailable(api))) return { state: "unavailable" };
    const raw = await api.call<Record<string, unknown>>("shift_quest_review_view", actor, submissionId);
    if (!raw || typeof raw.submission_id !== "string" || typeof raw.instance_id !== "string") return { state: "unavailable" };
    return {
      state: "ok",
      view: {
        submissionId: raw.submission_id,
        instanceId: raw.instance_id,
        revision: Number(raw.revision) || 0,
        status: typeof raw.status === "string" ? raw.status : "",
        isLatest: raw.is_latest === true,
        title: typeof raw.title === "string" ? raw.title : "",
        goal: typeof raw.goal === "string" ? raw.goal : "",
        criteria: typeof raw.criteria === "string" ? raw.criteria : "",
        evidence: text(raw.evidence),
        reflection: text(raw.reflection),
        artifactUrl: text(raw.artifact_url),
        redacted: raw.redacted === true,
        photos: await signedPhotos(photoRows(raw.photos)),
      },
    };
  } catch (error) {
    if (error instanceof QuestError && error.code === "not_authorized") return { state: "not_authorized" };
    if (error instanceof QuestError && error.code === "not_found") return { state: "not_found" };
    console.error(`[shift-island] loadReview failed (${error instanceof QuestError ? `sq:${error.code}` : error instanceof Error ? error.name : "unknown"})`);
    return { state: "unavailable" };
  }
}
