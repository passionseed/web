import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import {
  amountAfterTeamChange,
  createTeamError,
  joinTeamError,
  leaveTeamError,
  parseTeamCode,
  teamChangeOpen,
  type TeamChangeError,
  type TeamChanger,
} from "@/lib/hackathon/elemental/team-change";
import { isRudeTeamName } from "@/lib/hackathon/elemental/team-name";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import {
  createTeam,
  getRegistrationByToken,
  getTeamByCode,
  setRegistrationTeam,
  teamSeatsTaken,
} from "@/lib/supabase/hackathon-event-registrations";

const body = z.discriminatedUnion("action", [
  // A code, or a whole pasted invite link.
  z.object({ action: z.literal("join"), code: z.string().max(400) }),
  z.object({ action: z.literal("create"), name: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal("leave") }),
]);

const STATUS: Record<TeamChangeError, number> = {
  closed: 410,
  cancelled: 403,
  in_team: 409,
  not_in_team: 409,
  team_not_found: 404,
  team_full: 409,
};

const refuse = (error: TeamChangeError) => NextResponse.json({ error }, { status: STATUS[error] });

/**
 * Join a team with its code, start a team, or leave a team, from a person's
 * own page after signing up. The pay token in the URL is the only key, as for
 * the slip and the team name. Rules: lib/hackathon/elemental/team-change.ts.
 * Closed after ELEMENTAL.teamChangeClosesAt.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!teamChangeOpen()) return refuse("closed");
    const { token } = await params;
    const reg = await getRegistrationByToken(token, ELEMENTAL.maxGroupSize);
    if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const input = parsed.data;

    const changer: TeamChanger = {
      status: reg.status,
      memberCount: reg.memberCount,
      amountBaht: reg.amountBaht,
      teamId: reg.team?.id ?? null,
      onBuddyPass: reg.onBuddyPass,
    };

    if (input.action === "leave") {
      const error = leaveTeamError(changer);
      if (error) return refuse(error);
      const amountBaht = amountAfterTeamChange(changer, false);
      await setRegistrationTeam(reg.id, null, amountBaht);
      return NextResponse.json({ team: null, amountBaht });
    }

    if (input.action === "create") {
      const error = createTeamError(changer);
      if (error) return refuse(error);
      if (isRudeTeamName(input.name)) return NextResponse.json({ error: "rude" }, { status: 400 });
      const created = await createTeam(ELEMENTAL.slug, input.name);
      const amountBaht = amountAfterTeamChange(changer, true);
      await setRegistrationTeam(reg.id, { id: created.id, name: input.name }, amountBaht);
      return NextResponse.json({ team: { name: input.name, inviteCode: created.inviteCode }, amountBaht });
    }

    const code = parseTeamCode(input.code);
    // A code that can't be a team code gets the same answer as one no team has.
    const team = code ? await getTeamByCode(ELEMENTAL.slug, code, ELEMENTAL.maxGroupSize) : null;
    const error = joinTeamError(changer, team);
    if (error || !team) return refuse(error ?? "team_not_found");
    const amountBaht = amountAfterTeamChange(changer, true);
    await setRegistrationTeam(reg.id, { id: team.id, name: team.name }, amountBaht);
    // Someone else may have taken the last seat between the check and the
    // save. Count again, and step back out if the team is now over its size:
    // when two join at once, both may be turned away, never both let in.
    if ((await teamSeatsTaken(team.id)) > ELEMENTAL.maxGroupSize) {
      await setRegistrationTeam(reg.id, null, reg.amountBaht);
      return refuse("team_full");
    }
    return NextResponse.json({ team: { name: team.name, inviteCode: team.inviteCode }, amountBaht });
  } catch (error) {
    return safeServerError("Could not change the team", error);
  }
}
