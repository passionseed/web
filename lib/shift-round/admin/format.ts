import { missionTitle, type MissionTitleSource } from "@/lib/shift-round/certificate/missions";

import type {
  AdminEntry,
  AdminError,
  EvidenceType,
  MissionConfig,
  MissionCounts,
  RejectReasonCode,
  RoundPhase,
  RoundPolicy,
  ShiftRound,
  Track,
} from "./types";

/** Pure helpers for the SHIFT rounds staff tools. Every date is shown in ICT. */

export const ICT = "Asia/Bangkok";
const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` plus `days` (calendar arithmetic, no time zone involved). */
export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** `"19:00:00"` / `"19:00"` -> `"19:00"`; null when it is not a wall-clock time. */
export function hhmm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return `${m[1]}:${m[2]}`;
}

/** ICT calendar date of round day `day` (day 1 = the `starts_at` date). */
export function roundDate(round: Pick<ShiftRound, "starts_at">, day: number): string {
  return addDaysIso(ictDate(round.starts_at), day - 1);
}

/** "19:00–21:00" */
export function sessionTimeLabel(round: Pick<RoundPolicy, "session_start" | "session_end">): string {
  return `${hhmm(round.session_start) ?? round.session_start}–${hhmm(round.session_end) ?? round.session_end}`;
}

/** Display name of a round (D2). */
export function roundName(round: Pick<RoundPolicy, "number">): string {
  return `SHIFT[${round.number}]`;
}

/** `YYYY-MM-DD` (picked in the form) -> ISO instant of 00:00 ICT that day. */
export function ictMidnightIso(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date: ${date}`);
  return new Date(`${date}T00:00:00+07:00`).toISOString();
}

/** ICT calendar date (`YYYY-MM-DD`) of an instant. */
export function ictDate(ts: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ICT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof ts === "string" ? new Date(ts) : ts);
}

export function formatIct(ts: string | null | undefined, withTime = true): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ICT,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(d);
}

/** Close is 00:00 ICT on day duration+1; show it as 23:59 on the last day (R15). */
export function formatClose(closesAt: string): string {
  return `${formatIct(new Date(new Date(closesAt).getTime() - 60_000).toISOString(), false)}, 23:59`;
}

function dateDiffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY_MS);
}

/** Round day number in ICT (may be <= 0 before start or > duration after close). */
export function roundDay(round: Pick<ShiftRound, "starts_at">, now: Date = new Date()): number {
  return dateDiffDays(ictDate(now), ictDate(round.starts_at)) + 1;
}

export function roundPhase(
  round: Pick<ShiftRound, "starts_at" | "closes_at" | "review_ends_at">,
  now: Date = new Date(),
): RoundPhase {
  const t = now.getTime();
  if (t < Date.parse(round.starts_at)) return "upcoming";
  if (t < Date.parse(round.closes_at)) return "active";
  if (t < Date.parse(round.review_ends_at)) return "review";
  return "finished";
}

export const PHASE_LABEL: Record<RoundPhase, string> = {
  upcoming: "Upcoming",
  active: "Active",
  review: "In review",
  finished: "Finished",
};

// ---- Policy columns ---------------------------------------------------------

/** SHIFT template (D2): sessions on days 1, 2, 4, 6, 7 at 19:00-21:00 Bangkok. */
export const DEFAULT_SESSION_DAYS: readonly number[] = [1, 2, 4, 6, 7];
export const DEFAULT_SESSION_START = "19:00";
export const DEFAULT_SESSION_END = "21:00";

/**
 * Defaults for a new round: the SHIFT 7-day template (v2 spec D2, 2.1).
 * Invite join, mentor-led, join until day 2, the no-log nudge after the session.
 */
export const DEFAULT_POLICY: Omit<RoundPolicy, "number" | "starts_at"> = {
  title_th: "",
  title_en: "",
  brief_th: "",
  brief_en: "",
  tracks_open: ["high_school"],
  duration_days: 7,
  review_window_hours: 48,
  join_cutoff_day: 2,
  nudge_local_time: "21:15",
  rate_limit_per_hour: 30,
  grace_minutes: 30,
  squad_size: 3,
  retention_months: 12,
  audio_retention_days: 30,
  join_mode: "invite",
  mentor_led: true,
  discord_url: null,
  session_days: [...DEFAULT_SESSION_DAYS],
  session_start: DEFAULT_SESSION_START,
  session_end: DEFAULT_SESSION_END,
  curriculum_key: null,
  application_cohort: null,
};

/**
 * SHIFT default missions = SHIFT steps 1 to 7 (v2 spec 2.1). The database
 * column default; shown read-only when a round has no config yet.
 */
export const DEFAULT_MISSIONS: MissionConfig[] = [
  { key: "ideas", parts: [{ type: "ideas", need: 1 }] },
  { key: "interviews", parts: [{ type: "interview", need: 3, distinct: true }] },
  { key: "problem", parts: [{ type: "problem_statement", need: 1 }] },
  { key: "prototype", parts: [{ type: "mvp", need: 1 }] },
  { key: "testers", parts: [{ type: "tester", need: 3, distinct: true }] },
  { key: "change", parts: [{ type: "change", need: 1 }] },
  { key: "demo", parts: [{ type: "demo_post", need: 1 }] },
];

/**
 * Fields that stay editable after `starts_at` (spec 3.4 update_round; v2: the
 * session schedule, curriculum key and application cohort don't affect
 * eligibility, so lane A keeps them editable; the missions config locks).
 */
const ALWAYS_EDITABLE = new Set<keyof RoundPolicy | "status">([
  "discord_url",
  "brief_th",
  "brief_en",
  "title_th",
  "title_en",
  "status",
  "session_days",
  "session_start",
  "session_end",
  "curriculum_key",
  "application_cohort",
]);

/**
 * True when `field` can no longer change: every policy column except discord,
 * briefs, titles and status locks at `starts_at`; `join_cutoff_day` stays
 * editable until the cutoff day has passed.
 */
export function isPolicyLocked(
  field: keyof RoundPolicy,
  round: Pick<ShiftRound, "starts_at" | "join_cutoff_day">,
  now: Date = new Date(),
): boolean {
  if (ALWAYS_EDITABLE.has(field)) return false;
  if (now.getTime() < Date.parse(round.starts_at)) return false;
  if (field === "join_cutoff_day") return roundDay(round, now) > round.join_cutoff_day;
  return true;
}

const DISCORD = /^https:\/\/(discord\.gg|discord\.com)\//;

/** `shift_curriculum.round` keys: "2", "default", "shift3"... URL-safe, 1-64 chars (the column allows 64). */
export const CURRICULUM_KEY = /^[A-Za-z0-9_.\-[\]]{1,64}$/;

export function isCurriculumKey(value: unknown): value is string {
  return typeof value === "string" && CURRICULUM_KEY.test(value);
}

/** Client-side check before calling create/update; the RPC validates again. */
export function validatePolicy(p: Partial<RoundPolicy>): Partial<Record<keyof RoundPolicy, string>> {
  const errors: Partial<Record<keyof RoundPolicy, string>> = {};
  const len = (v: string | undefined, min: number, max: number) =>
    v !== undefined && (v.trim().length < min || v.trim().length > max);
  const range = (v: number | undefined, min: number, max: number) =>
    v !== undefined && (!Number.isInteger(v) || v < min || v > max);

  if (p.number !== undefined && (!Number.isInteger(p.number) || p.number < 1))
    errors.number = "Must be a whole number above 0";
  if (len(p.title_th, 1, 80)) errors.title_th = "1-80 characters";
  if (len(p.title_en, 1, 80)) errors.title_en = "1-80 characters";
  if (len(p.brief_th, 1, 400)) errors.brief_th = "1-400 characters";
  if (len(p.brief_en, 1, 400)) errors.brief_en = "1-400 characters";
  if (p.tracks_open !== undefined && p.tracks_open.length === 0)
    errors.tracks_open = "Open at least one track";
  if (range(p.duration_days, 5, 28)) errors.duration_days = "5-28 days";
  if (range(p.review_window_hours, 0, 336)) errors.review_window_hours = "0-336 hours";
  if (range(p.rate_limit_per_hour, 1, 120)) errors.rate_limit_per_hour = "1-120 per hour";
  if (range(p.grace_minutes, 0, 120)) errors.grace_minutes = "0-120 minutes";
  if (range(p.squad_size, 2, 6)) errors.squad_size = "2-6 people";
  if (range(p.retention_months, 1, 36)) errors.retention_months = "1-36 months";
  if (range(p.audio_retention_days, 1, 400)) errors.audio_retention_days = "1-400 days";
  if (p.join_cutoff_day !== undefined) {
    const max = p.duration_days ?? 28;
    if (range(p.join_cutoff_day, 1, max)) errors.join_cutoff_day = `1-${max}`;
  }
  if (p.nudge_local_time !== undefined && !/^\d{2}:\d{2}(:\d{2})?$/.test(p.nudge_local_time))
    errors.nudge_local_time = "HH:MM";
  if (p.discord_url && !DISCORD.test(p.discord_url))
    errors.discord_url = "Must start with https://discord.gg/ or https://discord.com/";
  if (p.session_days !== undefined) {
    const max = Number.isInteger(p.duration_days) ? (p.duration_days as number) : 28;
    const days = p.session_days;
    if (days.some((d) => !Number.isInteger(d) || d < 1 || d > max))
      errors.session_days = `เลือกได้แค่วันที่ 1-${max}`;
    else if (new Set(days).size !== days.length) errors.session_days = "วันซ้ำกัน";
  }
  const start = p.session_start === undefined ? undefined : hhmm(p.session_start);
  const end = p.session_end === undefined ? undefined : hhmm(p.session_end);
  if (start === null) errors.session_start = "HH:MM";
  if (end === null) errors.session_end = "HH:MM";
  if (start && end && end <= start) errors.session_end = "ต้องหลังเวลาเริ่ม";
  if (p.curriculum_key && !isCurriculumKey(p.curriculum_key))
    errors.curriculum_key = "1-64 ตัว: a-z, 0-9, _ - . [ ]";
  if (p.application_cohort && p.application_cohort.trim().length > 40)
    errors.application_cohort = "ไม่เกิน 40 ตัวอักษร";
  return errors;
}

// ---- Labels -----------------------------------------------------------------

export const TRACK_LABEL: Record<Track, string> = {
  high_school: "High school",
  university: "University",
};

export const EVIDENCE_TYPES: EvidenceType[] = [
  "contact",
  "ideas",
  "interview",
  "problem_statement",
  "mvp",
  "tester",
  "change",
  "demo_post",
  "daily",
];

export const TYPE_LABEL: Record<EvidenceType, string> = {
  contact: "Contact",
  ideas: "Ideas",
  interview: "Interview",
  problem_statement: "Problem statement",
  mvp: "MVP",
  tester: "Tester",
  change: "Change",
  demo_post: "Demo post",
  daily: "Daily update",
};

/** "2 · คุยกับคนที่เจอปัญหาจริง": position plus the round's (or the known) Thai title. */
export function missionLabel(mission: MissionTitleSource & { n?: number }): string {
  const title = missionTitle(mission).th;
  return mission.n ? `${mission.n} · ${title}` : title;
}

/** `missions_total` with a fallback for payloads from before v2. */
export function missionsTotal(counts: Pick<MissionCounts, "missions" | "missions_total"> | null | undefined): number {
  if (!counts) return DEFAULT_MISSIONS.length;
  return counts.missions_total ?? (counts.missions.length || DEFAULT_MISSIONS.length);
}

/** "interview ×3 คนไม่ซ้ำ" for the read-only missions config. */
export function missionPartsLabel(mission: Pick<MissionConfig, "parts">): string {
  return mission.parts
    .map((p) => `${TYPE_LABEL[p.type] ?? p.type} ×${p.need}${p.distinct ? " (คนไม่ซ้ำ)" : ""}`)
    .join(" + ");
}

export const REASON_CODES: RejectReasonCode[] = [
  "not_real_person",
  "duplicate",
  "missing_detail",
  "wrong_mission",
  "privacy",
  "link_broken",
  "other",
];

/** Staff-facing label; the student sees the Thai/English copy keyed `reason.*` in the app. */
export const REASON_LABEL: Record<RejectReasonCode, string> = {
  not_real_person: "Not a real conversation",
  duplicate: "Duplicate of an earlier log",
  missing_detail: "Not enough detail",
  wrong_mission: "Wrong Mission",
  privacy: "Contains personal details",
  link_broken: "Link doesn't open",
  other: "Other (note is shown to the student)",
};

const ERROR_MESSAGE: Record<string, string> = {
  unauthenticated: "Your session expired. Sign in again.",
  forbidden: "You don't have the SHIFT round role needed for this.",
  unavailable:
    "SHIFT rounds aren't available on this database yet (RPC missing or misconfigured).",
  retryable: "Couldn't reach the server. Try again.",
  invalid_field: "Check the highlighted field.",
  missing_field: "A required field is missing.",
  round_number_taken: "That round number is already used.",
  policy_locked: "This policy is locked because the round has started.",
  extend_after_issue: "Certificates have been issued in this round, so it can't be extended.",
  user_not_found: "No Passion Seed account uses that email.",
  role_from_web_admin:
    "This person is a web admin, so they are global SHIFT staff automatically. Remove the admin role on the Users page instead.",
  certificate_issued: "This entry already has a certificate, so it can't change.",
  mentor_not_in_round: "That person isn't a mentor or staff for this round. Add them in Settings first.",
  squad_full: "That squad is full.",
  wrong_round: "That squad belongs to another round.",
  round_finished: "This round has finished.",
  review_closed: "The review window for this round has ended.",
  invalid_transition: "That change isn't allowed from the item's current status. Reload and try again.",
  certificate_tombstoned: "The holder deleted their data, so this certificate can't be reinstated.",
  certificate_not_found: "Certificate not found.",
  entry_not_found: "Entry not found. It may have been deleted.",
  evidence_not_found: "Log not found. It may have been deleted.",
  round_not_found: "Round not found.",
};

/** Staff message for an error, keeping the code visible for support. */
export const NO_ROLE_MESSAGE =
  "You need a SHIFT round role; ask a global staff member to grant it in Settings.";

export function isNoRoundRole(error: AdminError): boolean {
  return error.code === "forbidden" && error.details?.rule === "no_shift_round_role";
}

/** Messages for `details.rule` where it says more than the code (e.g. invalid_field). */
const RULE_MESSAGE: Record<string, string> = {
  not_session_day: "That day has no mentor session in this round.",
  after_start: "The session has to end after it starts.",
};

export function describeError(error: AdminError): string {
  if (isNoRoundRole(error)) return NO_ROLE_MESSAGE;
  const rule = typeof error.details?.rule === "string" ? RULE_MESSAGE[error.details.rule] : undefined;
  const base = rule ?? ERROR_MESSAGE[error.code] ?? "Something went wrong.";
  const field = error.field ? ` Field: ${error.field}.` : "";
  const retry = error.retry_after ? ` Try again in ${Math.ceil(error.retry_after / 60)} min.` : "";
  return `${base}${field}${retry} (${error.code})`;
}

// ---- Squads -----------------------------------------------------------------

export interface SquadSuggestion {
  name: string;
  track: Track;
  entryIds: string[];
}

/**
 * Groups unassigned entrants by track in chunks of `size`, oldest joiners
 * first. A trailing group smaller than 2 stays unassigned (`leftover`).
 * Names continue "Squad N" after the highest existing number.
 */
export function suggestSquads(
  entries: Pick<AdminEntry, "id" | "track" | "joined_at" | "squad_id">[],
  size: number,
  existingNames: string[] = [],
): { squads: SquadSuggestion[]; leftover: string[] } {
  const taken = new Set(existingNames.map((n) => n.toLowerCase()));
  let counter = existingNames.reduce((max, name) => {
    const m = /^squad (\d+)$/i.exec(name.trim());
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  const nextName = () => {
    let name: string;
    do name = `Squad ${++counter}`;
    while (taken.has(name.toLowerCase()));
    taken.add(name.toLowerCase());
    return name;
  };

  const squads: SquadSuggestion[] = [];
  const leftover: string[] = [];
  const tracks: Track[] = ["high_school", "university"];
  for (const track of tracks) {
    const pool = entries
      .filter((e) => !e.squad_id && e.track === track)
      .sort((a, b) => a.joined_at.localeCompare(b.joined_at));
    for (let i = 0; i < pool.length; i += size) {
      const chunk = pool.slice(i, i + size).map((e) => e.id);
      if (chunk.length >= 2) squads.push({ name: nextName(), track, entryIds: chunk });
      else leftover.push(...chunk);
    }
  }
  return { squads, leftover };
}

export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of new Set(parts)) {
    (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p) ? valid : invalid).push(p);
  }
  return { valid, invalid };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
