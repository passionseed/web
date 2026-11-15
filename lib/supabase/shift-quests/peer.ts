import "server-only";

import type { QuestApi } from "@/bot/src/quests/api";
import { schemaOf } from "@/bot/src/quests/schema";
import { PEER_SCHEMA } from "@/lib/shift-island/peer";

import { photoRows, signedPhotos } from "./evidence";
import type { PeerCheckRow, PeerList, PeerQueueItem, PeerView } from "./peerTypes";

/**
 * The peer check's reads, shaped for the browser (schema 15,
 * 20261115140000_shift_quest_peer_check). The database decides who sees
 * what; these only check shapes, turn photo paths into signed links, and
 * never pass a Discord id, a member id or a Storage path on.
 */

/** True when the database has the peer check. A failed read counts as no. */
export async function peerAvailable(api: QuestApi): Promise<boolean> {
  try {
    return (await schemaOf(api)) >= PEER_SCHEMA;
  } catch {
    return false;
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const record = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);

export function queueFrom(raw: unknown): PeerQueueItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const row = record(r);
    if (!row || typeof row.submission_id !== "string") return [];
    return [{
      submissionId: row.submission_id,
      title: str(row.title),
      revision: Number(row.revision) || 0,
      createdAt: str(row.created_at),
      photos: Number(row.photos) || 0,
      checks: Number(row.checks) || 0,
    }];
  });
}

function checkFrom(raw: unknown): PeerCheckRow | null {
  const row = record(raw);
  if (!row || typeof row.id !== "string" || typeof row.line !== "string") return null;
  return {
    id: row.id,
    peer: strOrNull(row.peer),
    ticked: Array.isArray(row.ticked) ? row.ticked.filter((t): t is string => typeof t === "string") : [],
    line: row.line,
    createdAt: str(row.created_at),
    hidden: row.hidden === true,
  };
}

export function checkRows(raw: unknown): PeerCheckRow[] {
  return Array.isArray(raw) ? raw.flatMap((r) => {
    const check = checkFrom(r);
    return check ? [check] : [];
  }) : [];
}

const KINDS = new Set(["main", "side", "proposed"]);

/** shift_quest_peer_view's answer with its photos signed; null for anything else. */
export async function viewFrom(raw: unknown): Promise<PeerView | null> {
  const row = record(raw);
  if (!row || typeof row.submission_id !== "string") return null;
  const kind = KINDS.has(str(row.kind)) ? (row.kind as PeerView["kind"]) : "proposed";
  return {
    submissionId: row.submission_id,
    revision: Number(row.revision) || 0,
    status: str(row.status),
    title: str(row.title),
    goal: str(row.goal),
    criteria: str(row.criteria),
    kind,
    slug: strOrNull(row.slug),
    milestone: row.milestone == null ? null : Number(row.milestone) || null,
    evidence: strOrNull(row.evidence),
    reflection: strOrNull(row.reflection),
    artifactUrl: strOrNull(row.artifact_url),
    photos: await signedPhotos(photoRows(row.photos)),
    canCheck: row.can_check === true,
    mine: checkFrom(row.mine),
  };
}

export function listFrom(raw: unknown): PeerList | null {
  const row = record(raw);
  if (!row || typeof row.submission_id !== "string") return null;
  return {
    submissionId: row.submission_id,
    revision: Number(row.revision) || 0,
    peerOpen: row.peer_open === true,
    checks: checkRows(row.checks),
  };
}
