import { z } from "zod";

/**
 * The Elemental sign-up funnel: every step a person passes from the landing
 * page to a paid seat. The pages send one `elemental_funnel` event per step
 * to hackathon_events (through /api/hackathon/track-event), keyed by a
 * random browser id (`sid`), never by name or contact. The admin page counts
 * distinct ids per step to show where people stop.
 */

export const FUNNEL_EVENT_TYPE = "elemental_funnel";

/**
 * Steps in the order a person meets them. Optional steps (parent, old screens) only count people who saw them.
 * Sign-up went from one question a screen to three screens on 28 Nov 2026 (about you,
 * contact, review). The new screens have their own keys (SIGNUP_SCREENS); the old
 * screens' keys stay listed, marked removed, so events from before still read.
 */
export const FUNNEL_STEPS = [
  { key: "landing", label: "Saw the landing page" },
  { key: "join", label: "Opened sign-up" },
  { key: "screen:about", label: "About you: name, grade, school" },
  { key: "screen:contact", label: "Contact, and parent if under 20" },
  { key: "screen:review", label: "Review, price and agree" },
  { key: "step:mode", label: "Alone or with friends (screen removed 28 Nov)", optional: true, removed: true },
  { key: "step:name", label: "Name (screen removed 28 Nov)", optional: true, removed: true },
  { key: "step:team", label: "Named a team (screen removed 26 Nov)", optional: true, removed: true },
  { key: "step:school", label: "Age and school (screen removed 28 Nov)", optional: true, removed: true },
  { key: "step:parent", label: "Parent consent (screen removed 28 Nov)", optional: true, removed: true },
  { key: "step:contact", label: "Contact (screen removed 28 Nov)", optional: true, removed: true },
  { key: "step:heard", label: "Where they saw the post (screen removed 28 Nov)", optional: true, removed: true },
  { key: "step:review", label: "Review and agree (screen removed 28 Nov)", optional: true, removed: true },
  { key: "submitted", label: "Signed up" },
  { key: "pay", label: "Opened pay page" },
  { key: "slip", label: "Uploaded a slip" },
  { key: "paid", label: "Paid" },
] as const;

/** The three sign-up screens (join/draft.ts StepKey) and the funnel key each one sends. */
export const SIGNUP_SCREENS = {
  about: "screen:about",
  contact: "screen:contact",
  review: "screen:review",
} as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number]["key"];

/** Things that happen inside a step: a field that failed, a slip result. Not stages. */
/**
 * invite_shared: someone sent their team link. From the team card the detail
 * is how (copy, share, line, or code for the team code); from the invite at
 * the top of a paid page it is "paid:" and how (paid:line, paid:share, paid:copy).
 */
/** quiz_start, quiz_done (detail: the element) and quiz_shared (detail: how): the Elemental quiz. */
/** board_view and board_open (detail: the tile, "water" or "water:owner_id"): the problem board. */
/** parent_shared: an unpaid page sent to a parent (detail: line, share or copy); parent_opened: a parent opened it (?for=parent). */
export type FunnelDetailEvent =
  | "invalid"
  | "submit_failed"
  | "slip_result"
  | "qr_saved"
  | "invite_shared"
  | "quiz_start"
  | "quiz_done"
  | "quiz_shared"
  | "board_view"
  | "board_open"
  | "parent_shared"
  | "parent_opened";

export type FunnelEventData = {
  sid: string;
  step: FunnelStep | FunnelDetailEvent;
  /** For invalid: the field keys that failed (never their values). For slip_result: the result or reason. */
  detail?: string;
  /** buddy: a friend signing up with a ฿99 buddy pass (#415). */
  mode?: "solo" | "create" | "join" | "buddy";
  source?: string;
  /** The site it was sent to, set by the server from the request (never trusted from the browser). */
  host?: string;
};

/** Only these sites count; previews and local dev don't. */
export const FUNNEL_HOSTS = ["passionseed.org", "www.passionseed.org"];

const STEP_KEYS: [string, ...string[]] = [
  "invalid",
  "submit_failed",
  "slip_result",
  "qr_saved",
  "invite_shared",
  "quiz_start",
  "quiz_done",
  "quiz_shared",
  "board_view",
  "board_open",
  "parent_shared",
  "parent_opened",
  ...FUNNEL_STEPS.map((s) => s.key),
];

const incomingEvent = z.object({
  sid: z.string().uuid(),
  step: z.enum(STEP_KEYS),
  detail: z
    .string()
    .max(200)
    .regex(/^[a-zA-Z0-9_:,]*$/)
    .optional(),
  mode: z.enum(["solo", "create", "join", "buddy"]).optional(),
  source: z
    .string()
    .max(60)
    .regex(/^[a-z0-9_-]*$/)
    .optional(),
});

/**
 * Check an event from the browser before it's stored: a known step, a UUID
 * browser id and short, plain details. The host comes from the request, not
 * the browser, so only events really sent to passionseed.org count. Returns
 * null for anything else.
 */
export function cleanFunnelEvent(data: unknown, requestHost: string | null): FunnelEventData | null {
  const parsed = incomingEvent.safeParse(data);
  if (!parsed.success) return null;
  const host = (requestHost ?? "").toLowerCase().replace(/:\d+$/, "");
  return { ...(parsed.data as Omit<FunnelEventData, "host">), host };
}

export type FunnelRow = { event_data: unknown; created_at: string };

export type FunnelStage = {
  key: FunnelStep;
  label: string;
  people: number;
  /** Share of the previous required stage's people who reached this one (0..1), or null for the first and removed ones. */
  fromPrevious: number | null;
  /** How many people that share is out of. */
  outOf: number | null;
  optional: boolean;
  /** A screen that's no longer in the form: its count stays, without a share. */
  removed: boolean;
};

export type FunnelSummary = {
  stages: FunnelStage[];
  /** Field keys people got wrong, by people (not attempts), most common first. */
  invalidFields: { field: string; count: number }[];
  /** Slip results (paid, review, retry, rejected:amount, ...), most common first. */
  slipResults: { result: string; count: number }[];
  /** Team invite links sent, by detail (copy, share, line, code, paid:line …), most common first. */
  invitesShared: { how: string; count: number }[];
  /** Unpaid pages sent to a parent, by how (line, share, copy), most common first. */
  parentShared: { how: string; count: number }[];
  /** People who opened a pay page in the parent's view (?for=parent). */
  parentOpened: number;
  /** People by source (ig, line, team = a friend's invite link, ...) who opened sign-up. */
  sources: { source: string; people: number }[];
};

function parse(data: unknown): FunnelEventData | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.sid !== "string" || typeof d.step !== "string") return null;
  return {
    sid: d.sid,
    step: d.step as FunnelEventData["step"],
    detail: typeof d.detail === "string" ? d.detail : undefined,
    source: typeof d.source === "string" ? d.source : undefined,
  };
}

function ranked(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const FORM_KEYS = new Set<string>(Object.values(SIGNUP_SCREENS));

export function summarizeFunnel(rows: FunnelRow[]): FunnelSummary {
  const people = new Map<string, Set<string>>();
  /** The same, counting only events since the three-screen form's first one. */
  const recent = new Map<string, Set<string>>();
  const invalid = new Map<string, Set<string>>();
  const slip = new Map<string, number>();
  const invites = new Map<string, number>();
  const parentShares = new Map<string, number>();
  const bySource = new Map<string, Set<string>>();

  // When the three-screen form went live: its first event. Shares into and out of it count only
  // people seen since then, so the old form's sign-ups in the same window don't skew them.
  let formSince = Infinity;
  for (const row of rows) {
    const e = parse(row.event_data);
    const at = Date.parse(row.created_at);
    if (e && FORM_KEYS.has(e.step) && at < formSince) formSince = at;
  }

  const add = (map: Map<string, Set<string>>, key: string, sid: string) => {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(sid);
  };

  for (const row of rows) {
    const e = parse(row.event_data);
    if (!e) continue;
    if (e.step === "invalid") {
      for (const f of (e.detail ?? "").split(",").filter(Boolean)) add(invalid, f, e.sid);
      continue;
    }
    if (e.step === "slip_result" || e.step === "invite_shared" || e.step === "parent_shared") {
      const tally = e.step === "slip_result" ? slip : e.step === "invite_shared" ? invites : parentShares;
      if (e.detail) tally.set(e.detail, (tally.get(e.detail) ?? 0) + 1);
      continue;
    }
    add(people, e.step, e.sid);
    if (Date.parse(row.created_at) >= formSince) add(recent, e.step, e.sid);
    if (e.step === "join") add(bySource, e.source ?? "direct", e.sid);
  }

  let previous: string | null = null;
  const stages = FUNNEL_STEPS.map((s) => {
    const optional = "optional" in s && s.optional === true;
    const removed = "removed" in s && s.removed === true;
    const count = people.get(s.key)?.size ?? 0;
    // Across the form's edge, both sides count since the form went live.
    const since = previous !== null && (FORM_KEYS.has(s.key) || FORM_KEYS.has(previous));
    const outOf = previous === null || removed ? null : ((since ? recent : people).get(previous)?.size ?? 0);
    const reached = since ? (recent.get(s.key)?.size ?? 0) : count;
    const stage: FunnelStage = {
      key: s.key,
      label: s.label,
      people: count,
      fromPrevious: outOf === null ? null : outOf === 0 ? 0 : reached / outOf,
      outOf,
      optional,
      removed,
    };
    if (!optional) previous = s.key;
    return stage;
  });

  return {
    stages,
    invalidFields: ranked(new Map([...invalid].map(([f, ids]) => [f, ids.size]))).map(([field, count]) => ({ field, count })),
    slipResults: ranked(slip).map(([result, count]) => ({ result, count })),
    invitesShared: ranked(invites).map(([how, count]) => ({ how, count })),
    parentShared: ranked(parentShares).map(([how, count]) => ({ how, count })),
    parentOpened: people.get("parent_opened")?.size ?? 0,
    sources: [...bySource.entries()]
      .map(([source, ids]) => ({ source, people: ids.size }))
      .sort((a, b) => b.people - a.people || a.source.localeCompare(b.source)),
  };
}

/** The required stage that loses the biggest share of people, once at least `minPeople` reached the one before. */
export function worstDrop(stages: FunnelStage[], minPeople = 5): FunnelStage | null {
  let worst: FunnelStage | null = null;
  for (const s of stages) {
    if (s.optional || s.fromPrevious === null || (s.outOf ?? 0) < minPeople) continue;
    if (!worst || s.fromPrevious < (worst.fromPrevious ?? 1)) worst = s;
  }
  return worst;
}
