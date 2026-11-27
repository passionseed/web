import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { checkBoardName, checkStyleSave, type TeamNameStyle } from "@/lib/hackathon/elemental/team-style";
import { teamStyleEditable } from "@/lib/hackathon/elemental/team-style-phase";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { getRegistrationByToken } from "@/lib/supabase/hackathon-event-registrations";
import { teamHasStoryProof } from "@/lib/supabase/hackathon-story-proofs";
import { saveNameStyle, teamLinkNumbers, teamMemberIds } from "@/lib/supabase/hackathon-team-style";

const body = z.object({
  style: z.unknown().optional(),
  /** The name the team shows on the public board. Never defaulted from the sign-up. */
  boardName: z.string().max(200).optional(),
});

/**
 * Save a team's board name and/or name style from the pay page. Any member of
 * the team can (last save wins). The name gets the rude-word check; the style
 * must come from the fixed lists and use only what the team has unlocked: by
 * its share links' devices up to sign-up close, or all at once by a member's
 * live Instagram Story proof. Open until the end of Demo Day.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!teamStyleEditable()) return NextResponse.json({ error: "closed" }, { status: 403 });
    const { token } = await params;
    const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (reg.status === "cancelled") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success || (parsed.data.style === undefined && parsed.data.boardName === undefined)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    let boardName: string | undefined;
    if (parsed.data.boardName !== undefined) {
      const name = checkBoardName(parsed.data.boardName);
      if (!name.ok) return NextResponse.json({ error: name.error === "rude" ? "rude" : "invalid_name" }, { status: 400 });
      boardName = name.name;
    }

    const teamId = reg.team?.id ?? null;
    let style: TeamNameStyle | undefined;
    let devices: number | undefined;
    if (parsed.data.style !== undefined) {
      const ids = teamId ? await teamMemberIds(teamId) : [reg.id];
      // Unlocked by the team's devices, or all at once by a member's live Instagram Story proof.
      const [numbers, storyProof] = await Promise.all([teamLinkNumbers(ELEMENTAL.slug, ids), teamHasStoryProof(ELEMENTAL.slug, ids)]);
      devices = numbers.devices;
      const check = checkStyleSave(parsed.data.style, devices, storyProof);
      if (!check.ok) {
        return check.error === "locked"
          ? NextResponse.json({ error: "locked", parts: check.parts, devices }, { status: 403 })
          : NextResponse.json({ error: "invalid" }, { status: 400 });
      }
      style = check.style;
    }

    await saveNameStyle(ELEMENTAL.slug, { id: reg.id, teamId }, { style, boardName });
    return NextResponse.json({ style: style ?? null, boardName: boardName ?? null, devices: devices ?? null });
  } catch (error) {
    return safeServerError("Could not save the team name style", error);
  }
}
