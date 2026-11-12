import { NextResponse } from "next/server";

import { ISLAND_SEASON } from "@/lib/content/shift-island";
import { SEAL } from "@/lib/content/shift-island-invite";
import { safeServerError } from "@/lib/security/route-guards";
import { isConfirmed, islandDiscordUrl, MENTOR_TICKET, type IslandTicket } from "@/lib/shift/islandInvite";
import { createAlumniMember } from "@/lib/supabase/shift-alumni-members";
import { addIslandRsvp } from "@/lib/supabase/shift-island-rsvps";
import { loadIslandViewer } from "@/lib/supabase/shift-island-viewer";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * "I'm coming" for the SHIFT High Island. Alumni only (students are minors and
 * the island is a visible group space). Idempotent: a double tap returns the
 * same ticket without a second insert. The Discord link goes only to admins
 * and confirmed members; a pending member gets it from the team once checked.
 */
export async function POST() {
  try {
    const { viewer, userId, input } = await loadIslandViewer();

    if (viewer.kind === "going") {
      return reply({ ok: true, ticket: viewer.ticket, discordUrl: viewer.discordUrl, confirmed: viewer.confirmed });
    }
    if (viewer.kind === "signedOut" || !userId) return reply({ error: SEAL.signIn }, 401);
    if (viewer.kind === "notAlumni") return reply({ error: SEAL.notAlumni }, 403);
    if (viewer.kind === "closed") return reply({ error: SEAL.closed }, 422);

    let ticket: IslandTicket;
    let confirmed: boolean;
    if (input.member) {
      ticket = { nickname: input.member.nickname, cohort: input.member.cohort };
      confirmed = isConfirmed(input);
    } else if (input.linkedApplication) {
      // Confirmed when the paid application still checks out at insert time.
      const member = await createAlumniMember(userId, input.linkedApplication);
      ticket = { nickname: member.nickname, cohort: member.cohort };
      confirmed = isConfirmed({ isAdmin: input.isAdmin, member });
    } else {
      ticket = MENTOR_TICKET;
      confirmed = isConfirmed(input);
    }

    await addIslandRsvp(userId, ISLAND_SEASON.name);
    return reply({ ok: true, ticket, discordUrl: confirmed ? islandDiscordUrl() : null, confirmed });
  } catch (error) {
    console.error("[island-rsvp]", error);
    return safeServerError("Failed to save island RSVP", error);
  }
}
