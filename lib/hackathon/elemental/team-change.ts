import { INVITE_CODE_RE, elementalPriceBaht } from "./registration";

/**
 * Joining, starting and leaving a team after signing up, from a person's own
 * page (Angpao, 2026-11-27: "make it able to join and leave team like when we
 * do the next decade there will be team code"). The team code is the code in
 * the team's invite link.
 *
 * Shared by the page and the API route, so both apply the same rules.
 */

/** The sign-up that is changing teams, as the rules need it. */
export type TeamChanger = {
  status: "pending" | "review" | "paid" | "cancelled";
  memberCount: number;
  amountBaht: number;
  teamId: string | null;
  /** Signed up on a friend's buddy pass: its price belongs to the pass, not to a team. */
  onBuddyPass: boolean;
};

/**
 * The team code from what a person typed or pasted: the code itself (spaces
 * and dashes are fine, any case), or a whole invite link with ?team=.
 */
export function parseTeamCode(raw: string): string | null {
  const text = raw.trim();
  const fromLink = /[?&]team=([0-9a-fA-F]{12})(?![0-9a-fA-F])/.exec(text)?.[1];
  const code = (fromLink ?? text.replace(/[\s-]/g, "")).toLowerCase();
  return INVITE_CODE_RE.test(code) ? code : null;
}

/** A team code as shown and read aloud: three groups of four. */
export function formatTeamCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1 ");
}

export type TeamChangeError = "cancelled" | "in_team" | "not_in_team" | "team_not_found" | "team_full";

/** Why this sign-up can't join that team, or null when it can. */
export function joinTeamError(
  reg: TeamChanger,
  team: { id: string; spotsLeft: number } | null,
): TeamChangeError | null {
  if (reg.status === "cancelled") return "cancelled";
  // One team at a time: leave the old one first, so nobody changes teams by accident.
  if (reg.teamId) return "in_team";
  if (!team) return "team_not_found";
  if (team.spotsLeft < reg.memberCount) return "team_full";
  return null;
}

/** Why this sign-up can't start a team, or null when it can. */
export function createTeamError(reg: TeamChanger): TeamChangeError | null {
  if (reg.status === "cancelled") return "cancelled";
  return reg.teamId ? "in_team" : null;
}

/** Why this sign-up can't leave its team, or null when it can. */
export function leaveTeamError(reg: TeamChanger): TeamChangeError | null {
  if (reg.status === "cancelled") return "cancelled";
  return reg.teamId ? null : "not_in_team";
}

/**
 * What the sign-up costs after the change.
 * - Money already sent stays as it is: a paid sign-up, or one whose slip is
 *   being checked, keeps its amount (no refund and nothing more to pay).
 * - A friend on a buddy pass keeps the pass's price.
 * - A sign-up that hasn't paid yet gets the price of where it now stands:
 *   the group price in a team, the solo price alone, as at sign-up.
 */
export function amountAfterTeamChange(reg: TeamChanger, inTeam: boolean): number {
  if (reg.status !== "pending" || reg.onBuddyPass) return reg.amountBaht;
  return elementalPriceBaht(reg.memberCount, inTeam);
}
