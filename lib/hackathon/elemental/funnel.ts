import { z } from "zod";

/**
 * The Elemental sign-up funnel: every step a person passes from the landing
 * page to a paid seat. The pages send one `elemental_funnel` event per step
 * to hackathon_events (through /api/hackathon/track-event), keyed by a
 * random browser id (`sid`), never by name or contact. The admin page counts
 * distinct ids per step to show where people stop.
 */

export const FUNNEL_EVENT_TYPE = "elemental_funnel";

/** Steps in the order a person meets them. Optional steps (team, parent) only count people who saw them. */
export const FUNNEL_STEPS = [
  { key: "landing", label: "Saw the landing page" },
  { key: "join", label: "Opened sign-up" },
  { key: "step:mode", label: "Chose alone or with friends" },
  { key: "step:team", label: "Named a team", optional: true },
  { key: "step:name", label: "Name" },
  { key: "step:school", label: "Age and school" },
  { key: "step:parent", label: "Parent consent", optional: true },
  { key: "step:contact", label: "Contact" },
  { key: "step:heard", label: "Where they saw the post" },
  { key: "step:review", label: "Review and agree" },
  { key: "submitted", label: "Signed up" },
  { key: "pay", label: "Opened pay page" },
  { key: "slip", label: "Uploaded a slip" },
  { key: "paid", label: "Paid" },
] as const;

export type FunnelStep = (typeof FUNNEL_STEPS)[number]["key"];

/** Things that happen inside a step: a field that failed, a slip result. Not stages. */
/** invite_shared: someone sent their team link (detail: copy, share or line). */
/** quiz_start, quiz_done (detail: the element) and quiz_shared (detail: how): the Elemental quiz. */
export type FunnelDetailEvent =
  | "invalid"
  | "submit_failed"
  | "slip_result"
  | "qr_saved"
  | "invite_shared"
  | "quiz_start"
  | "quiz_done"
  | "quiz_shared";

export type FunnelEventData = {
  sid: string;
  step: FunnelStep | FunnelDetailEvent;
  /** For invalid: the field keys that failed (never their values). For slip_result: the result or reason. */
  detail?: string;
  mode?: "solo" | "create" | "join";
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
  mode: z.enum(["solo", "create", "join"]).optional(),
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
  /** Share of the previous required stage's people who reached this one (0..1), or null for the first. */
  fromPrevious: number | null;
  optional: boolean;
};

export type FunnelSummary = {
  stages: FunnelStage[];
  /** Field keys people got wrong, most common first. */
  invalidFields: { field: string; count: number }[];
  /** Slip results (paid, review, retry, rejected:amount, ...), most common first. */
  slipResults: { result: string; count: number }[];
  /** Team invite links sent, by how (copy, share, line), most common first. */
  invitesShared: { how: string; count: number }[];
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

export function summarizeFunnel(rows: FunnelRow[]): FunnelSummary {
  const people = new Map<string, Set<string>>();
  const invalid = new Map<string, number>();
  const slip = new Map<string, number>();
  const invites = new Map<string, number>();
  const bySource = new Map<string, Set<string>>();

  for (const row of rows) {
    const e = parse(row.event_data);
    if (!e) continue;
    if (e.step === "invalid") {
      for (const f of (e.detail ?? "").split(",").filter(Boolean)) invalid.set(f, (invalid.get(f) ?? 0) + 1);
      continue;
    }
    if (e.step === "slip_result" || e.step === "invite_shared") {
      const tally = e.step === "slip_result" ? slip : invites;
      if (e.detail) tally.set(e.detail, (tally.get(e.detail) ?? 0) + 1);
      continue;
    }
    if (!people.has(e.step)) people.set(e.step, new Set());
    people.get(e.step)!.add(e.sid);
    if (e.step === "join") {
      const s = e.source ?? "direct";
      if (!bySource.has(s)) bySource.set(s, new Set());
      bySource.get(s)!.add(e.sid);
    }
  }

  let previous: number | null = null;
  const stages = FUNNEL_STEPS.map((s) => {
    const optional = "optional" in s && s.optional === true;
    const count = people.get(s.key)?.size ?? 0;
    const stage: FunnelStage = {
      key: s.key,
      label: s.label,
      people: count,
      fromPrevious: previous === null ? null : previous === 0 ? 0 : count / previous,
      optional,
    };
    if (!optional) previous = count;
    return stage;
  });

  return {
    stages,
    invalidFields: ranked(invalid).map(([field, count]) => ({ field, count })),
    slipResults: ranked(slip).map(([result, count]) => ({ result, count })),
    invitesShared: ranked(invites).map(([how, count]) => ({ how, count })),
    sources: [...bySource.entries()]
      .map(([source, ids]) => ({ source, people: ids.size }))
      .sort((a, b) => b.people - a.people || a.source.localeCompare(b.source)),
  };
}

/** The required stage that loses the biggest share of people, once at least `minPeople` reached the one before. */
export function worstDrop(stages: FunnelStage[], minPeople = 5): FunnelStage | null {
  let worst: FunnelStage | null = null;
  let before = 0;
  for (const s of stages) {
    if (s.optional) continue;
    if (s.fromPrevious !== null && before >= minPeople && (!worst || s.fromPrevious < (worst.fromPrevious ?? 1))) worst = s;
    before = s.people;
  }
  return worst;
}
