/**
 * Validates progress events sent by the SeedStack OpenCode skills.
 *
 * The skills append events to a local JSONL file and sync them in batches, so
 * every event carries a client id and re-sending is a no-op. Anything that
 * does not fit the contract is dropped, never stored half-parsed.
 */

export const SEEDSTACK_STEPS = ["install", "scope", "ship"] as const;
export const SEEDSTACK_EVENTS = ["start", "stuck", "changed", "ticket", "done"] as const;
export const SEEDSTACK_MAX_BATCH = 100;

const MAX_TEXT = 280;
const MAX_URL = 500;
const MAX_MINUTES = 10080;
const CLIENT_ID = /^[A-Za-z0-9_-]{8,64}$/;

export type SeedstackStep = (typeof SEEDSTACK_STEPS)[number];
export type SeedstackEventKind = (typeof SEEDSTACK_EVENTS)[number];

export interface SeedstackEventInsert {
  client_event_id: string;
  step: SeedstackStep;
  event: SeedstackEventKind;
  minutes: number | null;
  next: string | null;
  detail: string | null;
  live_url: string | null;
  client_ts: string | null;
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

function shortText(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function minutesOf(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(MAX_MINUTES, Math.max(0, Math.round(value)));
}

function httpUrl(value: unknown): string | null {
  const text = shortText(value, MAX_URL);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isoTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

export function parseSeedstackEvent(raw: unknown): SeedstackEventInsert | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== "string" || !CLIENT_ID.test(e.id)) return null;
  if (!oneOf(SEEDSTACK_STEPS, e.step) || !oneOf(SEEDSTACK_EVENTS, e.event)) return null;

  return {
    client_event_id: e.id,
    step: e.step,
    event: e.event,
    minutes: minutesOf(e.minutes),
    next: shortText(e.next),
    detail: shortText(e.detail),
    live_url: httpUrl(e.live_url),
    client_ts: isoTime(e.ts),
  };
}

/** Accepts one event or `{ events: [...] }`. Returns valid events and a reject count. */
function eventList(body: unknown): unknown[] | null {
  if (!body || typeof body !== "object") return null;
  const events = (body as { events?: unknown }).events;
  if (Array.isArray(events)) return events;
  return [body];
}

export function parseSeedstackBatch(body: unknown): { events: SeedstackEventInsert[]; rejected: number } | null {
  const list = eventList(body);
  if (!list || list.length === 0 || list.length > SEEDSTACK_MAX_BATCH) return null;

  const events = list.map(parseSeedstackEvent).filter((e): e is SeedstackEventInsert => e !== null);
  return { events, rejected: list.length - events.length };
}
