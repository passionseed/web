import { after, NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { DEFAULT_BUDDY_OWE, isSameContact } from "@/lib/hackathon/elemental/buddy-pass";
import {
  elementalPriceBaht,
  elementalRegistrationOpen,
  normalizeSource,
  registrationSchema,
} from "@/lib/hackathon/elemental/registration";
import { notifyElementalSignup } from "@/lib/hackathon/elemental/notify";
import { sendRegistrationEmail } from "@/lib/hackathon/elemental/registration-email";
import { safeServerError } from "@/lib/security/route-guards";
import {
  createRegistration,
  createTeam,
  getBuddyPass,
  getTeamByInviteCode,
  isUniqueViolation,
} from "@/lib/supabase/hackathon-event-registrations";

/**
 * Save an Elemental sign-up and return the pay page's token. Paying is a
 * separate step: people register now and pay later from their own page.
 * - solo: alone, at the solo price
 * - create: start a team (group price) and get an invite link for friends
 * - join: join a team by its invite code (group price) while it has room
 * - buddy: one friend on a paid solo sign-up's buddy pass (buddy price). The
 *   price is set here, never taken from the client, and the database lets
 *   only one sign-up that isn't cancelled hold a pass.
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
    if (input.teamMode === "buddy") {
      const pass = await getBuddyPass(ELEMENTAL.slug, input.passCode!);
      if (pass.state !== "available" || !pass.registrationId) {
        return NextResponse.json({ error: `pass_${pass.state}` }, { status: 409 });
      }
      if (isSameContact(input, { contactEmail: pass.contactEmail ?? "", contactPhone: pass.contactPhone ?? "" })) {
        return NextResponse.json({ error: "pass_self" }, { status: 409 });
      }
      const amount = ELEMENTAL.buddyPriceBaht;
      const buddyInput = { ...input, source: input.source ?? "buddy" };
      let payToken: string;
      try {
        ({ payToken } = await createRegistration(
          ELEMENTAL.slug,
          buddyInput,
          amount,
          null,
          { fromRegistrationId: pass.registrationId, owe: input.buddyOwe ?? DEFAULT_BUDDY_OWE },
        ));
      } catch (error) {
        // Another friend took the pass a moment ago.
        if (isUniqueViolation(error)) return NextResponse.json({ error: "pass_used" }, { status: 409 });
        throw error;
      }
      after(() => notifyElementalSignup(buddyInput, null, amount));
      await sendRegistrationEmail({ to: input.contactEmail, payToken, amountBaht: amount, team: null });
      return NextResponse.json({ payToken, amountBaht: amount });
    }

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
    after(() => notifyElementalSignup(input, team, amount));
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
