import { randomBytes } from "node:crypto";

/**
 * Short-lived, in-memory previews: what a student typed into a modal, held
 * while they look at the preview and choose who sees it. Nothing is written
 * until they confirm. A restart loses open previews (the student is asked to
 * submit again); that is the price of not storing unconfirmed text.
 */
const TTL_MS = 30 * 60_000;
const MAX_DRAFTS = 500;

interface Draft {
  userId: string;
  data: unknown;
  expires: number;
}

const drafts = new Map<string, Draft>();

function sweep(now: number): void {
  for (const [key, draft] of drafts) {
    if (draft.expires <= now) drafts.delete(key);
  }
  // Oldest first: Map keeps insertion order.
  while (drafts.size >= MAX_DRAFTS) {
    const oldest = drafts.keys().next().value;
    if (oldest === undefined) break;
    drafts.delete(oldest);
  }
}

export function putDraft(userId: string, data: unknown, now = Date.now()): string {
  sweep(now);
  const key = randomBytes(9).toString("base64url");
  drafts.set(key, { userId, data, expires: now + TTL_MS });
  return key;
}

/** The draft, only for the person who wrote it and only while fresh. */
export function getDraft<T>(key: string, userId: string, now = Date.now()): T | null {
  const draft = drafts.get(key);
  if (!draft || draft.userId !== userId || draft.expires <= now) return null;
  return draft.data as T;
}

export function dropDraft(key: string): void {
  drafts.delete(key);
}
