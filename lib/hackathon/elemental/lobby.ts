import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import type { BoardEntry } from "./team-style-board";
import type { TeamNameStyle } from "./team-style";
import { elementalCountingEndsAt } from "./link-views-shared";
import { boardPhase, demoDayEndsAt } from "./team-style-phase";

/**
 * The Elemental waiting room (Big, 2026-11-28: "a kahoot waiting room ux for
 * the one who signed up, to showoff their cool name"): a countdown to the
 * opening, how many teams and people are in, and every team's custom name as
 * it arrives. Not a ranking: no devices, no paid numbers, no schools.
 * Students are mostly minors, so a team shows only under a board name a
 * member typed (rude-word checked, staff can hide), never a nickname or the
 * sign-up's "ทีม<nickname>" default. Pure and safe in the browser; the
 * database side is lobbyPayload in lib/supabase/hackathon-leaderboard.ts.
 */

/** How often an open lobby asks for new names. */
export const LOBBY_POLL_MS = 12_000;

/**
 * From sign-up close, show only teams with at least one paid member, and count
 * paid people only. Big decides (2026-11-28); off until then.
 */
export const LOBBY_PAID_ONLY_AFTER_CLOSE = false;

/** Whether the paid-only rule applies at this moment. */
export function lobbyPaidOnly(now: Date = new Date(), setting: boolean = LOBBY_PAID_ONLY_AFTER_CLOSE): boolean {
  return setting && now.getTime() > elementalCountingEndsAt().getTime();
}

/** The projector's ?delay=<minutes>: a whole number from 0 to 120; anything else is 0. */
export function parseDelayMinutes(raw: unknown): number {
  const n = typeof raw === "string" && /^\d{1,3}$/.test(raw) ? Number(raw) : 0;
  return Math.min(120, n);
}

/** The opening slot from the programme (facts.ts): Fri 4 Dec 19:00, Bangkok. */
export function openingAt(): Date {
  const slot = ELEMENTAL.schedule.find((s) => s.kind === "open");
  const date = slot?.date ?? ELEMENTAL.startDate;
  const time = slot?.time ?? "00:00";
  return new Date(`${date}T${time}:00+07:00`);
}

/**
 * - soon: before sharing opens (the board's flag): "coming soon";
 * - waiting: the countdown runs;
 * - started: the opening has begun, until the end of Demo Day (the hype screen on the opening stream);
 * - over: after Demo Day, the names stay as a wall, nothing moves;
 * - unavailable: the names failed to load.
 */
export type LobbyState = "soon" | "waiting" | "started" | "over" | "unavailable";

export function lobbyState(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): Exclude<LobbyState, "unavailable"> {
  if (now.getTime() > demoDayEndsAt().getTime()) return "over";
  if (now.getTime() >= openingAt().getTime()) return "started";
  // Before the opening, the board's flag decides ("coming soon" until sharing opens).
  return boardPhase(env, now) === "soon" ? "soon" : "waiting";
}

/** One team in the room: its key, its board name and its style. Nothing else. */
export type LobbyTeam = { key: string; name: string; style: TeamNameStyle; solo: boolean };

export type LobbyPayload = {
  state: LobbyState;
  /** Newest first. */
  teams: LobbyTeam[];
  /** People signed up in the listed teams. */
  people: number;
  /** The countdown's target (openingAt). */
  openingAt: string;
  /** The server's clock when this was made, so the countdown can start without a jump. */
  now: string;
};

/**
 * The room: every team with a board name that staff haven't hidden, whatever
 * its devices, newest arrival first (by when the name was FIRST set, so a
 * rename never bumps a team to the top; teams without a time go last, in key
 * order, so the order never shuffles between polls).
 * - paidOnly (lobbyPaidOnly): only teams with a paid member, and paid people only;
 * - delayMinutes (the projector's ?delay=): only names set at least that long
 *   before now, so staff can screen them during the opening. Names without a
 *   time are old ones and stay.
 */
export function lobbyTeams(
  entries: readonly BoardEntry[],
  opts: { paidOnly?: boolean; delayMinutes?: number; now?: Date } = {},
): { teams: LobbyTeam[]; people: number } {
  const at = (e: BoardEntry) => (e.nameSetAt ? new Date(e.nameSetAt).getTime() : Number.NEGATIVE_INFINITY);
  const cutoff = opts.delayMinutes ? (opts.now ?? new Date()).getTime() - opts.delayMinutes * 60_000 : Number.POSITIVE_INFINITY;
  const shown = entries.filter(
    (e): e is BoardEntry & { name: string } => Boolean(e.name) && !e.hidden && (!opts.paidOnly || (e.paidPeople ?? 0) > 0) && at(e) <= cutoff,
  );
  shown.sort((a, b) => at(b) - at(a) || a.key.localeCompare(b.key));
  return {
    teams: shown.map((e) => ({ key: e.key, name: e.name, style: e.style, solo: e.solo })),
    people: shown.reduce((n, e) => n + (opts.paidOnly ? (e.paidPeople ?? 0) : (e.people ?? 1)), 0),
  };
}

/** The countdown's parts: days, hours, minutes, seconds left (all 0 once it's reached). */
export function countdownParts(target: Date, now: Date): { days: number; hours: number; minutes: number; seconds: number; done: boolean } {
  const left = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  return {
    days: Math.floor(left / 86_400),
    hours: Math.floor((left % 86_400) / 3600),
    minutes: Math.floor((left % 3600) / 60),
    seconds: left % 60,
    done: left === 0,
  };
}

/** Keys in next that weren't in seen, in next's order (newest first): the arrivals to pop in. */
export function arrivals(seen: ReadonlySet<string>, next: readonly LobbyTeam[]): string[] {
  return next.filter((t) => !seen.has(t.key)).map((t) => t.key);
}
