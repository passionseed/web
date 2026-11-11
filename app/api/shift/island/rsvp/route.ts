import { NextResponse } from "next/server";

import { ISLAND_SEASON } from "@/lib/content/shift-island";
import { SEAL } from "@/lib/content/shift-island-invite";
import { safeServerError } from "@/lib/security/route-guards";
import { islandDiscordUrl, MENTOR_TICKET, type IslandTicket } from "@/lib/shift/islandInvite";
import { createAlumniMember } from "@/lib/supabase/shift-alumni-members";
import { addIslandRsvp } from "@/lib/supabase/shift-island-rsvps";
import { loadIslandViewer } from "@/lib/supabase/shift-island-viewer";

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * "I'm coming" for the SHIFT High Island. Alumni only (students are minors and
 * the island is a visible group space). Idempotent: a double tap returns the
 * same ticket without a second insert.
 */
export async function POST() {
  try {
    const { viewer, userId, input } = await loadIslandViewer();

    if (viewer.kind === "going") {
      return reply({ ok: true, ticket: viewer.ticket, discordUrl: viewer.discordUrl });
    }
    if (viewer.kind === "signedOut" || !userId) return reply({ error: SEAL.signIn }, 401);
    if (viewer.kind === "notAlumni") return reply({ error: SEAL.notAlumni }, 403);
    if (viewer.kind === "closed") return reply({ error: SEAL.closed }, 422);

    let ticket: IslandTicket;
    if (input.member) {
      ticket = { nickname: input.member.nickname, cohort: input.member.cohort };
    } else if (input.linkedApplication) {
      const member = await createAlumniMember(userId, input.linkedApplication);
      ticket = { nickname: member.nickname, cohort: member.cohort };
    } else {
      ticket = MENTOR_TICKET;
    }

    await addIslandRsvp(userId, ISLAND_SEASON.name);
    return reply({ ok: true, ticket, discordUrl: islandDiscordUrl() });
  } catch (error) {
    return safeServerError("Failed to save island RSVP", error);
  }
}
