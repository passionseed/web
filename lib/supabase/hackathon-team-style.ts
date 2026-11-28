import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { shareCode, shareSource } from "@/lib/hackathon/elemental/share";
import { boardKey } from "@/lib/hackathon/elemental/team-style-board";
import { boardPhase, teamStyleEditable } from "@/lib/hackathon/elemental/team-style-phase";
import { clampStyle, readStyle, type TeamNameStyle, type TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";
import { linkStats } from "@/lib/supabase/hackathon-link-views";
import { forgetBoard, loadLeaderboard } from "@/lib/supabase/hackathon-leaderboard";
import { teamHasStoryProof } from "@/lib/supabase/hackathon-story-proofs";

/**
 * Team name styles and board names (service role). A team's live on
 * hackathon_event_teams; a sign-up without a team keeps its own on its
 * registration. Any member may change them; the last save wins.
 */

/** The sign-ups on a team that aren't cancelled. */
export async function teamMemberIds(teamId: string): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("hackathon_event_registrations")
    .select("id")
    .eq("team_id", teamId)
    .neq("status", "cancelled");
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

/**
 * Devices and paid seats summed over the members' own share links. linkStats
 * counts only up to sign-up close, so unlocks freeze at close.
 */
export async function teamLinkNumbers(eventSlug: string, registrationIds: string[]): Promise<{ devices: number; paid: number }> {
  const stats = await linkStats(eventSlug, registrationIds.map((id) => shareSource(shareCode(id))));
  let devices = 0;
  let paid = 0;
  for (const s of stats.values()) {
    devices += s.devices;
    paid += s.paid;
  }
  return { devices, paid };
}

type Owner = { id: string; teamId: string | null };

/** Whether this sign-up still has to pay (no slip yet). The lobby links an unpaid viewer back to the pay page. */
async function payPending(registrationId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().from("hackathon_event_registrations").select("status").eq("id", registrationId).maybeSingle();
  if (error) throw error;
  return data?.status === "pending";
}

/** The saved style and board name, read fresh. Throws if the columns don't exist yet. */
async function readOwn(owner: Owner): Promise<{ style: unknown; boardName: string | null }> {
  const db = createAdminClient();
  const { data, error } = owner.teamId
    ? await db.from("hackathon_event_teams").select("name_style, board_name").eq("id", owner.teamId).maybeSingle()
    : await db.from("hackathon_event_registrations").select("name_style, board_name").eq("id", owner.id).maybeSingle();
  if (error) throw error;
  return { style: data?.name_style ?? null, boardName: data?.board_name ?? null };
}

/** Save a style and/or a board name, for the team or for a sign-up without one. */
export async function saveNameStyle(
  eventSlug: string,
  owner: Owner,
  change: { style?: TeamNameStyle; boardName?: string },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (change.style) update.name_style = change.style;
  if (change.boardName !== undefined) update.board_name = change.boardName;
  if (Object.keys(update).length === 0) return;
  const db = createAdminClient();
  const table = owner.teamId ? "hackathon_event_teams" : "hackathon_event_registrations";
  const id = owner.teamId ?? owner.id;
  const { error } = await db.from(table).update(update).eq("id", id);
  if (error) throw error;
  // When the name was FIRST set: the lobby's arrival order, so a rename never bumps a team to the top.
  if (change.boardName !== undefined) {
    const { error: firstError } = await db.from(table).update({ board_name_set_at: new Date().toISOString() }).eq("id", id).is("board_name_set_at", null);
    if (firstError) throw firstError;
  }
  forgetBoard(eventSlug);
}

/** Staff: take a team (or a sign-up without a team) off the public board, or put it back. */
export async function setBoardHidden(eventSlug: string, owner: { kind: "team" | "solo"; id: string }, hidden: boolean): Promise<void> {
  const db = createAdminClient();
  const { error } =
    owner.kind === "team"
      ? await db.from("hackathon_event_teams").update({ leaderboard_hidden: hidden }).eq("id", owner.id).eq("event_slug", eventSlug)
      : await db.from("hackathon_event_registrations").update({ leaderboard_hidden: hidden }).eq("id", owner.id).eq("event_slug", eventSlug);
  if (error) throw error;
  forgetBoard(eventSlug);
}

/**
 * The team's row for its TeamLine and the team editor, once the board has
 * launched: its board name, style, devices, rank, and whether a member's
 * live Instagram Story proof has unlocked every style. Null on any error
 * (for example before the migration is applied), so the pay page never
 * breaks because of it.
 */
export async function loadTeamStyleCard(
  eventSlug: string,
  reg: { id: string; team: { id: string } | null },
  shareHref: string | null,
): Promise<TeamStyleCardData | null> {
  const phase = boardPhase();
  if (phase === "soon") return null;
  try {
    const owner = { id: reg.id, teamId: reg.team?.id ?? null };
    const ids = owner.teamId ? await teamMemberIds(owner.teamId) : [reg.id];
    // teamHasStoryProof never throws (false without the table), so the row still loads.
    const [own, numbers, board, storyUnlocked, pending] = await Promise.all([
      readOwn(owner),
      teamLinkNumbers(eventSlug, ids),
      loadLeaderboard(eventSlug),
      teamHasStoryProof(eventSlug, ids),
      payPending(reg.id),
    ]);
    const key = boardKey({ teamId: owner.teamId, registrationId: reg.id });
    const row = board.find((e) => e.key === key);
    return {
      key,
      boardName: own.boardName,
      solo: !owner.teamId,
      style: clampStyle(readStyle(own.style), numbers.devices, storyUnlocked),
      devices: numbers.devices,
      storyUnlocked,
      payPending: pending,
      paid: numbers.paid,
      rank: row?.rank ?? null,
      teamsOnBoard: board.length,
      editable: teamStyleEditable(),
      final: phase === "final",
      shareHref,
    };
  } catch (error) {
    console.error("[elemental team style] no team row", error);
    return null;
  }
}
