/**
 * SHIFT alumni board: goal cards, team standups, help on stuck, a progress
 * feed and real-user tests. Pure types, rules and Thai copy, so they are easy
 * to test; database access lives in lib/supabase/shift-alumni-board/.
 */

export const MAX_TEXT = 500;
export const QUIET_DAYS = 3;
export const HISTORY_ROUNDS = 8;

/** "Start 10 minutes": the timer length, and how long a forgotten start stays open. */
export const START_MINUTES = 10;
export const START_OPEN_MINUTES = 60;
export const STARTS_PER_HOUR = 30;
export const POSTS_PER_DAY = 20;
export const TESTS_PER_DAY = 30;
export const WHO_MAX = 80;
export const TEAM_NAME_MAX = 80;

export type GoalStatus = "open" | "done" | "not_done";
export const GOAL_STATUSES: GoalStatus[] = ["open", "done", "not_done"];

export const REACTIONS = ["🔥", "👏", "💡"] as const;
export type Reaction = (typeof REACTIONS)[number];

/** Admins are the mentors: they see every team and run rounds. */
export type BoardRole = "student" | "mentor";

export interface BoardViewer {
  userId: string;
  name: string;
  role: BoardRole;
  teamId: string | null;
}

export interface Round {
  id: number;
  started_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  round_id: number;
  long_term: string;
  month_goal: string;
  week_goal: string;
  done_when: string;
  first_step: string;
  status: GoalStatus;
  updated_at: string;
}

export type GoalFields = Pick<Goal, "long_term" | "month_goal" | "week_goal" | "done_when" | "first_step">;

export interface Start {
  id: string;
  started_at: string;
  finished_at: string | null;
  note: string;
}

export interface UserTest {
  id: string;
  who: string;
  learned: string;
  created_at: string;
}

export interface HistoryRound {
  roundId: number;
  startedAt: string;
  weekGoal: string;
  status: GoalStatus | null;
}

export interface History {
  rounds: HistoryRound[];
  streak: number;
}

export const STATUS_LABEL: Record<GoalStatus, string> = {
  open: "⏳ กำลังทำ",
  done: "✅ เสร็จ",
  not_done: "❌ ยังไม่เสร็จ",
};

export const statusLabel = (status: GoalStatus | null | undefined) =>
  status ? STATUS_LABEL[status] : "ยังไม่ตั้งเป้า";

export const HISTORY_MARK: Record<GoalStatus, string> = { done: "✅", not_done: "❌", open: "⚪" };

export const GOAL_FIELDS: { name: keyof GoalFields; label: string; hint: string }[] = [
  { name: "long_term", label: "🏔 ระยะยาว", hint: "โปรเจกต์สำเร็จหน้าตาเป็นยังไง ใครใช้ ใช้ทำอะไร" },
  { name: "month_goal", label: "🗓 1 เดือน", hint: "อีก 1 เดือนจะไปถึงไหน" },
  { name: "week_goal", label: "👣 สัปดาห์นี้", hint: "ก่อนเจอกันครั้งหน้า อะไรจะเสร็จ" },
  { name: "done_when", label: "เสร็จ =", hint: "ตรวจได้ว่าใช่หรือไม่ใช่ เช่น ส่งลิงก์ให้ครู 3 คนแล้ว" },
  { name: "first_step", label: "⚡ ก้าวแรก", hint: "สิ่งที่ทำได้ภายใน 10 นาที" },
];

/** Questions that help a stuck friend think it through, instead of handing them the answer. */
export const HELP_PROMPTS = ["ลองแบ่งให้เล็กลงได้ไหม?", "ใครช่วยได้บ้าง?", "ถ้าทำแค่ 10 นาที จะทำอะไร?", "ลองอะไรไปแล้วบ้าง?"];

export const CHEERS = [
  "เริ่มได้แล้ว = ชนะไปครึ่งนึง 💪",
  "ส่วนที่ยากที่สุดคือการเริ่ม ผ่านมาแล้ว 🔥",
  "10 นาทีนี้เป็นของเรา เก่งมาก ✨",
  "ก้าวเล็ก ๆ ก็พาไปถึงได้ 🚀",
];

/** Same cheer for the same start, so a refresh doesn't change it. */
export function cheerFor(startId: string): string {
  let sum = 0;
  for (const ch of startId) sum = (sum + ch.charCodeAt(0)) % 997;
  return CHEERS[sum % CHEERS.length];
}

export function clean(value: unknown, max = MAX_TEXT): string {
  return String(value ?? "").trim().slice(0, max);
}

/** Students are in Thailand: `<input type="datetime-local">` gives "2026-10-20T19:00" with no zone. */
export function parseBangkokLocal(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const bangkokFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatBangkok(iso: string | null | undefined): string {
  return iso ? bangkokFormat.format(new Date(iso)) : "";
}

const bangkokClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "19:05" in Thai time. */
export function formatBangkokClock(iso: string | null | undefined): string {
  return iso ? bangkokClock.format(new Date(iso)) : "";
}

export function isQuiet(lastActiveAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastActiveAt) return true;
  return now - Date.parse(lastActiveAt) > QUIET_DAYS * 24 * 60 * 60 * 1000;
}

/** Rounds in a row, counting back from the newest finished one, where the week goal was marked done. */
export function streak(statusesNewestFirst: (GoalStatus | null | undefined)[]): number {
  let count = 0;
  for (const status of statusesNewestFirst) {
    if (status !== "done") break;
    count++;
  }
  return count;
}

/** Past rounds for one person, newest first. A round with no week goal shows as status null. */
export function buildHistory(
  rounds: Round[],
  goalsByRound: Map<number, Pick<Goal, "week_goal" | "status">>,
): History {
  const list = rounds.map((r) => {
    const g = goalsByRound.get(r.id);
    return { roundId: r.id, startedAt: r.started_at, weekGoal: g?.week_goal ?? "", status: g?.week_goal ? g.status : null };
  });
  return { rounds: list, streak: streak(list.map((r) => r.status)) };
}

export interface StuckRow {
  user_id: string;
  stuck: string;
  unstuck_at: string | null;
  replies: number;
}

/**
 * Who is stuck right now, from this round's standups oldest first. Each
 * person's latest standup wins, so an empty "stuck" or one marked solved
 * clears the flag. `solved` counts people, like `stuck` does.
 */
export function summarizeStuck(rows: StuckRow[]) {
  const latest: Record<string, StuckRow> = {};
  for (const row of rows) latest[row.user_id] = row;
  const stuck: Record<string, string> = {};
  const replies: Record<string, number> = {};
  for (const [id, row] of Object.entries(latest)) {
    if (row.stuck && !row.unstuck_at) {
      stuck[id] = row.stuck;
      replies[id] = row.replies || 0;
    }
  }
  const solved = Object.values(latest).filter((row) => row.stuck && row.unstuck_at).length;
  return { stuck, replies, solved };
}

/** Starts begun after this time can still be open. */
export function openStartCutoff(now = Date.now()): string {
  return new Date(now - START_OPEN_MINUTES * 60_000).toISOString();
}

export function isOpenStart(start: Pick<Start, "started_at" | "finished_at"> | null | undefined, now = Date.now()) {
  return Boolean(start && !start.finished_at && Date.parse(start.started_at) > Date.parse(openStartCutoff(now)));
}

/** Seconds left on the timer, between 0 and START_MINUTES * 60, even with clock skew. */
export function startSecondsLeft(start: Pick<Start, "started_at">, now = Date.now()): number {
  const left = Math.ceil((Date.parse(start.started_at) + START_MINUTES * 60_000 - now) / 1000);
  return Math.max(0, Math.min(START_MINUTES * 60, left)) || 0;
}

/** The cheer after finishing stays for a few minutes, so a refresh doesn't lose it. */
export function isJustFinished(start: Pick<Start, "finished_at"> | null | undefined, now = Date.now(), minutes = 5) {
  if (!start?.finished_at) return false;
  const age = now - Date.parse(start.finished_at);
  return age >= 0 && age < minutes * 60_000;
}

/** Only http(s) links. "" means no link; null means rejected. */
export function parseLink(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length > MAX_TEXT) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/** A short label for a link, e.g. "github.com". */
export function linkHost(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** One-line preview: newlines become spaces, long text gets an ellipsis. */
export function snippet(text: string | null | undefined, max: number): string {
  const chars = [...String(text ?? "").replace(/\s+/g, " ").trim()];
  return chars.length > max ? `${chars.slice(0, max - 1).join("").trimEnd()}…` : chars.join("");
}

/** Nudge toward a first real-user test once the student knows what they're building. */
export function needsTestNudge(goal: Partial<GoalFields> | null | undefined, totalTests: number): boolean {
  return !totalTests && Boolean(goal && (goal.week_goal || goal.month_goal || goal.long_term));
}

export const canSeeTeam = (viewer: BoardViewer, teamId: string | null | undefined) =>
  Boolean(teamId) && (viewer.role === "mentor" || viewer.teamId === teamId);

export const BOARD_PATH = "/shift/alumni/board";
