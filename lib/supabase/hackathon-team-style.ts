import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { shareCode, shareSource } from "@/lib/hackathon/elemental/share";
import { boardKey } from "@/lib/hackathon/elemental/team-style-board";
import { clampStyle, readStyle, type TeamNameStyle, type TeamStyleCardData } from "@/lib/hackathon/elemental/team-style";
import { linkStats } from "@/lib/supabase/hackathon-link-views";
import { forgetBoard, loadLeaderboard } from "@/lib/supabase/hackathon-leaderboard";

/**
 * Team name styles (service role). A team's style lives on
 * hackathon_event_teams; a sign-up without a team keeps its style and board
 * name on its own registration. Any member may change the style; the last
 * save wins.
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

/** Devices and paid seats summed over the members' own share links. */
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

/** The saved style and board name, read fresh. Throws if the style columns don't exist yet. */
async function readOwn(owner: Owner): Promise<{ style: unknown; name: string | null }> {
  const db = createAdminClient();
  if (owner.teamId) {
    const { data, error } = await db.from("hackathon_event_teams").select("name, name_style").eq("id", owner.teamId).maybeSingle();
    if (error) throw error;
    return { style: data?.name_style ?? null, name: data?.name ?? null };
  }
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .select("team_name, name_style, leaderboard_name")
    .eq("id", owner.id)
    .maybeSingle();
  if (error) throw error;
  return { style: data?.name_style ?? null, name: data?.leaderboard_name || data?.team_name || null };
}

/** Save a team's style, or a solo sign-up's style and board name. */
export async function saveNameStyle(eventSlug: string, owner: Owner, style: TeamNameStyle, soloName?: string): Promise<void> {
  const db = createAdminClient();
  const { error } = owner.teamId
    ? await db.from("hackathon_event_teams").update({ name_style: style }).eq("id", owner.teamId)
    : await db
        .from("hackathon_event_registrations")
        .update({ name_style: style, ...(soloName !== undefined ? { leaderboard_name: soloName } : {}) })
        .eq("id", owner.id);
  if (error) throw error;
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
 * The pay page's name style card. Null on any error (for example before the
 * migration is applied), so the pay page never breaks because of it.
 */
export async function loadTeamStyleCard(
  eventSlug: string,
  reg: { id: string; team: { id: string } | null },
  shareHref: string | null,
): Promise<TeamStyleCardData | null> {
  try {
    const owner = { id: reg.id, teamId: reg.team?.id ?? null };
    const ids = owner.teamId ? await teamMemberIds(owner.teamId) : [reg.id];
    const [own, numbers, board] = await Promise.all([readOwn(owner), teamLinkNumbers(eventSlug, ids), loadLeaderboard(eventSlug)]);
    const key = boardKey({ teamId: owner.teamId, registrationId: reg.id });
    const row = board.find((e) => e.key === key);
    return {
      key,
      name: own.name,
      canName: !owner.teamId,
      style: clampStyle(readStyle(own.style), numbers.devices),
      devices: numbers.devices,
      paid: numbers.paid,
      rank: row?.rank ?? null,
      teamsOnBoard: board.length,
      shareHref,
    };
  } catch (error) {
    console.error("[elemental team style] no style card", error);
    return null;
  }
}
