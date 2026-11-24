import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { getRegistrationByToken, renameTeam } from "@/lib/supabase/hackathon-event-registrations";

const body = z.object({ name: z.string().trim().min(1).max(80) });

/**
 * Rename a team from the pay page. Only the person who started the team can,
 * and the same rude-word check as sign-up applies.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const { token } = await params;
    const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!reg.team || !reg.isTeamStarter || reg.status === "cancelled") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    if (isRudeTeamName(parsed.data.name)) return NextResponse.json({ error: "rude" }, { status: 400 });

    await renameTeam(reg.team.id, parsed.data.name);
    return NextResponse.json({ name: parsed.data.name });
  } catch (error) {
    return safeServerError("Could not rename the team", error);
  }
}
