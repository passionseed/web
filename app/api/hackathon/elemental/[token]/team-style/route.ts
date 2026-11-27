import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { shareOpen } from "@/lib/hackathon/elemental/share";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import { checkStyleSave, SOLO_NAME_MAX } from "@/lib/hackathon/elemental/team-style";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { getRegistrationByToken } from "@/lib/supabase/hackathon-event-registrations";
import { saveNameStyle, teamLinkNumbers, teamMemberIds } from "@/lib/supabase/hackathon-team-style";

const body = z.object({
  style: z.unknown(),
  /** Only for a sign-up without a team: the name it shows on the board. */
  name: z.string().trim().min(1).max(SOLO_NAME_MAX).optional(),
});

/**
 * Save a team's name style from the pay page. Any member of the team can
 * (last save wins). The style must come from the fixed lists and use only
 * what the team's share links have unlocked; both are checked here.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!shareOpen()) return NextResponse.json({ error: "closed" }, { status: 403 });
    const { token } = await params;
    const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (reg.status === "cancelled") return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const soloName = reg.team ? undefined : parsed.data.name;
    if (soloName && isRudeTeamName(soloName)) return NextResponse.json({ error: "rude" }, { status: 400 });

    const teamId = reg.team?.id ?? null;
    const ids = teamId ? await teamMemberIds(teamId) : [reg.id];
    const { devices } = await teamLinkNumbers(ELEMENTAL.slug, ids);
    const check = checkStyleSave(parsed.data.style, devices);
    if (!check.ok) {
      return check.error === "locked"
        ? NextResponse.json({ error: "locked", parts: check.parts, devices }, { status: 403 })
        : NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    await saveNameStyle(ELEMENTAL.slug, { id: reg.id, teamId }, check.style, soloName);
    return NextResponse.json({ style: check.style, name: soloName ?? null, devices });
  } catch (error) {
    return safeServerError("Could not save the team name style", error);
  }
}
