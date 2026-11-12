import type { IslandViewer as InviteViewer } from "@/lib/shift/islandInvite";

/**
 * One address, /shift/island, for the invitation and the game. Pure on
 * purpose (no Supabase or server imports), so the rule is unit-testable.
 *
 * - The game: an RSVPed visitor the game lets in (eligible, `ready` or
 *   `not_started`). Staff (mentors, reviewers) the game lets in skip the
 *   RSVP: they are not alumni and never get a ticket.
 * - The invitation (prologue, bottle, letter, seal, ticket): everyone else.
 *   Signed out, not alumni, not RSVPed, or RSVPed and not let in yet. For
 *   the last group the ticket carries a door: what stands between them and
 *   the island.
 */

/** The game viewer's states (lib/supabase/shift-quests/types IslandViewer). */
export type GameState = "signed_out" | "no_discord" | "not_eligible" | "unavailable" | "not_started" | "ready";

/** Under the ticket: sign in with Discord, wait for the SHIFT high role, or the island is off right now. */
export type IslandDoor = "discord" | "waiting" | "closed";

export type IslandEntry = { show: "game" } | { show: "invite"; door: IslandDoor | null };

export interface GameView {
  state: GameState;
  /** Staff in the quest database (only known once the game lets them in). */
  staff?: boolean;
}

function doorFor(state: GameState): IslandDoor {
  switch (state) {
    case "signed_out":
    case "no_discord":
      return "discord";
    case "not_eligible":
      return "waiting";
    case "unavailable":
    case "not_started":
    case "ready":
      return "closed";
  }
}

export function islandEntry(invite: InviteViewer, game: GameView): IslandEntry {
  const letIn = game.state === "ready" || game.state === "not_started";
  if (letIn && (invite.kind === "going" || game.staff === true)) return { show: "game" };
  return { show: "invite", door: invite.kind === "going" ? doorFor(game.state) : null };
}

/** The game viewer is only worth resolving (Discord and quest database calls) for someone signed in. */
export function needsGameViewer(invite: InviteViewer): boolean {
  return invite.kind !== "signedOut";
}
