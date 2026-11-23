import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import {
  elementalPriceBaht,
  elementalRegistrationOpen,
  normalizeSource,
  registrationSchema,
} from "@/lib/hackathon/elemental/registration";
import { sendRegistrationEmail } from "@/lib/hackathon/elemental/registration-email";
import { safeServerError } from "@/lib/security/route-guards";
import {
  createRegistration,
  createTeam,
  getTeamByInviteCode,
} from "@/lib/supabase/hackathon-event-registrations";

/**
 * Save an Elemental sign-up and return the pay page's token. Paying is a
 * separate step: people register now and pay later from their own page.
 * - solo: alone, at the solo price
 * - create: start a team (group price) and get an invite link for friends
 * - join: join a team by its invite code (group price) while it has room
 */
export async function POST(request: NextRequest) {
  if (!elementalRegistrationOpen()) {
    return NextResponse.json({ error: "closed" }, { status: 410 });
  }

  const json = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) },
      { status: 400 },
    );
  }

  const input = { ...parsed.data, source: normalizeSource(parsed.data.source) };

  try {
    let team: { id: string; name: string; inviteCode: string } | null = null;
    if (input.teamMode === "join") {
      const found = await getTeamByInviteCode(ELEMENTAL.slug, input.inviteCode!, ELEMENTAL.maxGroupSize);
      if (!found) return NextResponse.json({ error: "team_not_found" }, { status: 404 });
      if (found.spotsLeft < input.members.length) {
        return NextResponse.json({ error: "team_full" }, { status: 409 });
      }
      team = found;
    } else if (input.teamMode === "create") {
      const created = await createTeam(ELEMENTAL.slug, input.teamName!);
      team = { ...created, name: input.teamName! };
    }

    const amount = elementalPriceBaht(input.members.length, team !== null);
    const { payToken } = await createRegistration(ELEMENTAL.slug, input, amount, team);
    await sendRegistrationEmail({
      to: input.contactEmail,
      payToken,
      amountBaht: amount,
      team: team ? { name: team.name, inviteCode: team.inviteCode } : null,
    });
    return NextResponse.json({ payToken, amountBaht: amount });
  } catch (error) {
    return safeServerError("Failed to save registration", error);
  }
}
