/**
 * Client RPC wrappers for Radar Guide analytics (spec sections 3.2, 3.3, 4).
 *
 * Every write is fire-and-forget: nothing here throws, and analytics never
 * blocks the page. Local and LAN hosts are skipped (lib/radar/analytics-host)
 * so admin metrics stay production-clean.
 *
 * Inputs are cleaned to the SQL rules before sending, so the RPC never has to
 * reject a well-meant event (for example the synthetic "__score__" card id).
 */
import { createClient } from "@/utils/supabase/client";
import { shouldSkipRadarAnalytics } from "@/lib/radar/analytics-host";
import { getRadarSessionId } from "@/lib/supabase/radar";
import { validateCareerRequest } from "./career-request";
import {
  GUIDE_EVENT_TARGET_PATTERN,
  GUIDE_EVENT_TYPES,
  GUIDE_ONCE_EVENT_TYPES,
  RADAR_RPC,
  RADAR_PAGE_KEY_PATTERN,
  RADAR_RPC_ERROR,
  RADAR_SESSION_ID_PATTERN,
  RADAR_SLUG_PATTERN,
  UUID_PATTERN,
  type CareerRequestResult,
  type GuideEventInput,
  type GuideEventType,
  type GuideTracker,
  type RadarAttribution,
  type RecordRadarGuideEventArgs,
  type RecordRadarVisitArgs,
  type SubmitRadarCareerRequestArgs,
} from "./types";

type RpcError = { code?: string; message?: string } | null;
type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ error: RpcError }>;
};

/** Metadata is capped at 1KB in SQL (`pg_column_size`); stay well under it. */
const METADATA_MAX_JSON = 700;
const METADATA_MAX_KEYS = 12;
const METADATA_KEY_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const METADATA_MAX_STRING = 120;

function rpcClient(): RpcClient {
  // The Radar RPCs are newer than the generated types.
  return createClient() as unknown as RpcClient;
}

function sessionId(): string | null {
  const id = getRadarSessionId();
  return RADAR_SESSION_ID_PATTERN.test(id) ? id : null;
}

function cleanSlug(slug: string | null | undefined): string | null {
  return typeof slug === "string" && RADAR_SLUG_PATTERN.test(slug) ? slug : null;
}

function isVisitId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Pure argument builders (tested)
// ---------------------------------------------------------------------------

/** Only the six known keys, only non-null values. */
export function visitAttrPayload(attribution: RadarAttribution | null): Partial<RadarAttribution> {
  if (!attribution) return {};
  const payload: Partial<RadarAttribution> = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "referrer_host",
    "ua_app",
  ] as const) {
    const value = attribution[key];
    if (value) (payload as Record<string, string>)[key] = value;
  }
  return payload;
}

/** Primitive values only, short strings, small keys, under the SQL size cap. */
export function cleanEventMetadata(
  metadata: GuideEventInput["metadata"]
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  if (!metadata || typeof metadata !== "object") return clean;
  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(clean).length >= METADATA_MAX_KEYS) break;
    if (!METADATA_KEY_PATTERN.test(key)) continue;
    if (typeof value === "string") clean[key] = value.slice(0, METADATA_MAX_STRING);
    else if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
    else if (typeof value === "boolean") clean[key] = value;
  }
  return JSON.stringify(clean).length <= METADATA_MAX_JSON ? clean : {};
}

function cleanValueInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100000
    ? value
    : null;
}

/**
 * The key sent as `p_chapter_key`: the code guide `pageKey` when it matches
 * RADAR_PAGE_KEY_PATTERN (the SQL CHECK), else a deck `chapterKey` that
 * matches it, else null. The column keeps its name and holds page keys.
 */
export function eventPageKey(event: Pick<GuideEventInput, "pageKey" | "chapterKey">): string | null {
  for (const key of [event.pageKey, event.chapterKey]) {
    if (typeof key === "string" && RADAR_PAGE_KEY_PATTERN.test(key)) return key;
  }
  return null;
}

export function isGuideEventType(value: unknown): value is GuideEventType {
  return typeof value === "string" && (GUIDE_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * RPC args for one guide event, or null when the event cannot be stored
 * (unknown type). Fields that would fail the SQL patterns are dropped, not
 * sent: a non-UUID `cardId` (the "__score__" card), a malformed page key, a
 * malformed target, an out-of-range value.
 */
export function guideEventArgs(
  ctx: { sessionId: string; visitId: string; fieldSlug: string | null },
  event: GuideEventInput
): RecordRadarGuideEventArgs | null {
  if (!isGuideEventType(event.type)) return null;
  const fieldSlug = cleanSlug(ctx.fieldSlug);
  return {
    p_session_id: ctx.sessionId,
    p_visit_id: ctx.visitId,
    p_event_type: event.type,
    p_field_slug: fieldSlug,
    p_chapter_key: eventPageKey(event),
    // A card id is only checked against the field, so it needs a field too.
    p_card_id: fieldSlug && isVisitId(event.cardId) ? event.cardId : null,
    p_target:
      typeof event.target === "string" && GUIDE_EVENT_TARGET_PATTERN.test(event.target)
        ? event.target
        : null,
    p_value_int: cleanValueInt(event.valueInt),
    p_metadata: cleanEventMetadata(event.metadata),
  };
}

/**
 * The key SQL dedups "once" events on (visit, type, page, value), after the
 * same cleaning as `guideEventArgs`. Null for repeatable events.
 */
export function guideEventOnceKey(visitId: string, event: GuideEventInput): string | null {
  if (!(GUIDE_ONCE_EVENT_TYPES as readonly string[]).includes(event.type)) return null;
  return `${visitId}|${event.type}|${eventPageKey(event) ?? ""}|${cleanValueInt(event.valueInt) ?? -1}`;
}

export function careerRequestResultForError(error: RpcError): CareerRequestResult {
  if (!error) return "ok";
  if (error.code === RADAR_RPC_ERROR.invalid) return "invalid";
  if (error.code === RADAR_RPC_ERROR.rateLimited) return "rate_limited";
  return "failed";
}

// ---------------------------------------------------------------------------
// RPC wrappers
// ---------------------------------------------------------------------------

/** Records one visit (hub when `fieldSlug` is null). Duplicate visit ids are ignored by SQL. */
export async function recordRadarVisit(input: {
  visitId: string;
  fieldSlug: string | null;
  attribution: RadarAttribution | null;
}): Promise<void> {
  try {
    if (typeof window === "undefined" || shouldSkipRadarAnalytics()) return;
    const session = sessionId();
    if (!session || !isVisitId(input.visitId)) return;
    const args: RecordRadarVisitArgs = {
      p_session_id: session,
      p_visit_id: input.visitId,
      p_field_slug: cleanSlug(input.fieldSlug),
      p_attr: visitAttrPayload(input.attribution),
    };
    const { error } = await rpcClient().rpc(RADAR_RPC.recordVisit, args as unknown as Record<string, unknown>);
    if (error) console.warn("[radar] visit not recorded", error.code ?? "");
  } catch {
    console.warn("[radar] visit not recorded");
  }
}

/** Sends one guide event. Never throws. */
export async function recordGuideEvent(
  ctx: { visitId: string; fieldSlug: string | null },
  event: GuideEventInput
): Promise<void> {
  try {
    if (typeof window === "undefined" || shouldSkipRadarAnalytics()) return;
    const session = sessionId();
    if (!session || !isVisitId(ctx.visitId)) return;
    const args = guideEventArgs({ ...ctx, sessionId: session }, event);
    if (!args) return;
    await sendGuideEventArgs(args);
  } catch {
    console.warn("[radar] guide event not recorded");
  }
}

async function sendGuideEventArgs(args: RecordRadarGuideEventArgs): Promise<void> {
  const { error } = await rpcClient().rpc(
    RADAR_RPC.recordGuideEvent,
    args as unknown as Record<string, unknown>
  );
  if (error) console.warn("[radar] guide event not recorded", error.code ?? "");
}

/**
 * Validates first with the same rule as SQL, then submits. On a local host
 * nothing is written and a valid request reports "ok", so the form can be
 * tried in development.
 */
export async function submitCareerRequest(
  ctx: { visitId: string | null; fieldSlug: string | null },
  text: string
): Promise<CareerRequestResult> {
  const validation = validateCareerRequest(text);
  if (!validation.ok) return "invalid";
  try {
    if (typeof window === "undefined") return "failed";
    if (shouldSkipRadarAnalytics()) return "ok";
    const session = sessionId();
    if (!session) return "failed";
    const args: SubmitRadarCareerRequestArgs = {
      p_session_id: session,
      p_visit_id: isVisitId(ctx.visitId) ? ctx.visitId : null,
      p_text: validation.text,
      p_from_field_slug: cleanSlug(ctx.fieldSlug),
    };
    const { error } = await rpcClient().rpc(
      RADAR_RPC.submitCareerRequest,
      args as unknown as Record<string, unknown>
    );
    if (error) console.warn("[radar] career request not saved", error.code ?? "");
    return careerRequestResultForError(error);
  } catch {
    return "failed";
  }
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

/** Client-side ceiling, under the SQL limit of 60 events per session per minute. */
export const TRACKER_EVENTS_PER_MINUTE = 50;
const QUEUE_LIMIT = 30;

export interface GuideTrackerCore {
  /** Sets the visit; queued events are sent then. */
  setVisit(visitId: string | null): void;
  track(event: GuideEventInput): void;
  submitCareerRequest(text: string): Promise<CareerRequestResult>;
  visitId(): string | null;
}

export interface GuideTrackerDeps {
  send?: (ctx: { visitId: string; fieldSlug: string | null }, event: GuideEventInput) => void;
  submit?: typeof submitCareerRequest;
  now?: () => number;
}

/**
 * The state behind a `GuideTracker`. Events tracked before the visit id is
 * known (child effects run before the parent's) are queued, then sent. Once
 * events (chapter_view, video_*) are sent at most once per visit, which saves
 * the rate limit; SQL dedups them as well.
 */
export function createGuideTrackerCore(
  fieldSlug: string | null,
  deps: GuideTrackerDeps = {}
): GuideTrackerCore {
  const send = deps.send ?? ((ctx, event) => void recordGuideEvent(ctx, event));
  const submit = deps.submit ?? submitCareerRequest;
  const now = deps.now ?? Date.now;
  let visitId: string | null = null;
  const queue: GuideEventInput[] = [];
  const sentOnce = new Set<string>();
  const recent: number[] = [];

  function dispatch(event: GuideEventInput) {
    if (!visitId || !isGuideEventType(event.type)) return;
    const onceKey = guideEventOnceKey(visitId, event);
    if (onceKey) {
      if (sentOnce.has(onceKey)) return;
      sentOnce.add(onceKey);
    }
    const t = now();
    while (recent.length && t - recent[0] > 60_000) recent.shift();
    if (recent.length >= TRACKER_EVENTS_PER_MINUTE) return;
    recent.push(t);
    send({ visitId, fieldSlug }, event);
  }

  return {
    setVisit(next) {
      visitId = isVisitId(next) ? next : null;
      if (!visitId) return;
      for (const event of queue.splice(0)) dispatch(event);
    },
    track(event) {
      try {
        if (!visitId) {
          if (queue.length < QUEUE_LIMIT) queue.push(event);
          return;
        }
        dispatch(event);
      } catch {
        // Analytics never breaks the page.
      }
    },
    submitCareerRequest(text) {
      return submit({ visitId, fieldSlug }, text);
    },
    visitId: () => visitId,
  };
}

/** A tracker that records nothing (fromPlan previews, tests, B1 before C lands). */
export const NOOP_GUIDE_TRACKER: GuideTracker = {
  visitId: null,
  track: () => {},
  submitCareerRequest: async (text) => (validateCareerRequest(text).ok ? "failed" : "invalid"),
};
