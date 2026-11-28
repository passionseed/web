import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { teamLabel } from "./team-name";

/**
 * A team's invite link and the message that goes with it, shared by the team
 * card (TeamInvite) and the invite at the top of a paid page (PaidInvite), so
 * both send friends to the same place.
 */

/** The sign-up link that puts a friend in this team. src=team marks friends who arrive from an invite link in the funnel's sources. */
export function teamInviteUrl(origin: string, inviteCode: string): string {
  return `${origin}/hackathon/join?team=${inviteCode}&src=team`;
}

/** What a share sends: who is asking, and the link. */
export function teamInviteMessage(teamName: string, url: string): string {
  return `มาเข้า${teamLabel(teamName)} ลง ${ELEMENTAL.edition} Hackathon ด้วยกัน สมัครที่ลิงก์นี้: ${url}`;
}

/** LINE's share screen with the message filled in. */
export function lineShareUrl(text: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(text)}`;
}

/** The bet for the sign-up push (Big, 2026-11-28): every payer brings 2 friends. */
export const INVITE_ASK = 2;

/** How many friends the paid page asks for: two, or fewer when the team has fewer seats left. */
export function inviteAsk(spotsLeft: number): number {
  return Math.max(0, Math.min(INVITE_ASK, spotsLeft));
}

/**
 * What the paid page's invite shows:
 * - invite: in a team with seats left, so send the link;
 * - start: no team yet and team changes are open, so start one first (PR #429);
 * - null: nothing to ask (the team is full, sign-up has closed, or a person
 *   without a team can no longer start one).
 */
export type PaidInviteState = "invite" | "start" | null;

export function paidInviteState({
  team,
  teamChangeOpen,
  signUpOpen,
}: {
  team: { spotsLeft: number } | null;
  teamChangeOpen: boolean;
  signUpOpen: boolean;
}): PaidInviteState {
  // A friend joins by signing up, so once sign-up closes there is nobody left to ask.
  if (!signUpOpen) return null;
  if (team) return team.spotsLeft > 0 ? "invite" : null;
  return teamChangeOpen ? "start" : null;
}

/** One seat in the team-status row: a member who has paid, one who hasn't, one of the friends asked for, or an open seat. */
export type InviteSeat = "paid" | "unpaid" | "ask" | "open";

/** The team's seats, in order, for the status row. Without a team, the person is the one paid seat. */
export function inviteSeats(roster: { paid: boolean }[] | null, maxSize: number): InviteSeat[] {
  const members: InviteSeat[] = (roster ?? [{ paid: true }]).slice(0, maxSize).map((m) => (m.paid ? "paid" : "unpaid"));
  const ask = inviteAsk(maxSize - members.length);
  return Array.from({ length: maxSize }, (_, i) => members[i] ?? (i < members.length + ask ? "ask" : "open"));
}

/** Where on the site an invite was sent from. The team card sends the bare way ("copy"); the paid page prefixes it. */
export type InviteSpot = "paid";
export type InviteHow = "line" | "share" | "copy";

/** The funnel's invite_shared detail for a share from a spot: "paid:line". */
export function inviteDetail(spot: InviteSpot, how: InviteHow): string {
  return `${spot}:${how}`;
}
