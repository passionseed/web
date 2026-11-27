import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { elementalCountingEndsAt } from "./link-views-shared";

/**
 * When the team board and the name styles are on. Safe to import in the browser.
 * - soon: before sharing opens (ELEMENTAL_SHARE_OPEN unset), the board says "coming soon";
 * - live: sharing is open, numbers move;
 * - final: sign-up has closed, the standings are frozen as of
 *   elementalCountingEndsAt() and labelled final. Once closed it never goes
 *   back to "coming soon", whatever the flag says.
 * Names and styles are cosmetic, so they stay editable until the end of Demo Day.
 */
export type BoardPhase = "soon" | "live" | "final";

export function boardPhase(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): BoardPhase {
  if (now.getTime() > elementalCountingEndsAt().getTime()) return "final";
  return env.ELEMENTAL_SHARE_OPEN === "1" ? "live" : "soon";
}

/** The last moment of Demo Day, Bangkok time. */
export function demoDayEndsAt(): Date {
  return new Date(`${ELEMENTAL.demoDay.date}T23:59:59+07:00`);
}

/** Board names and styles can be changed: while live, and after close until the end of Demo Day. */
export function teamStyleEditable(env: NodeJS.ProcessEnv = process.env, now: Date = new Date()): boolean {
  const phase = boardPhase(env, now);
  return phase === "live" || (phase === "final" && now.getTime() <= demoDayEndsAt().getTime());
}

/** How often an open board page asks for new numbers. */
export const BOARD_POLL_MS = 20_000;

/**
 * Left by the pay page's team row in this browser tab, so the board can mark
 * "your team" and send the person back to their own share page. It never
 * goes in a URL (the share page's address holds the pay token).
 */
export const BOARD_YOU_KEY = "el-board-you";
export type BoardYou = {
  key: string;
  /** Their share page, for "share my link". */
  shareHref: string | null;
  /** Their pay page, where the board name is set. */
  payHref: string | null;
  devices: number;
  named: boolean;
};
