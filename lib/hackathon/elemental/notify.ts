import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import type { Registration } from "@/lib/hackathon/elemental/registration";
import {
  getRegistrationForNotice,
  listRegistrationTotals,
} from "@/lib/supabase/hackathon-event-registrations";
import { buildPaidPayload, buildSignupPayload, postHackathonWebhook } from "./notify-discord";
import { summarizeRegistrations } from "./seats";

/**
 * Server glue for the Elemental Discord pings: reads the live totals, builds
 * the message and posts it. Call inside after(), so the person never waits.
 * Never throws.
 */

async function totals() {
  const t = summarizeRegistrations(await listRegistrationTotals(ELEMENTAL.slug));
  return { signups: t.sources.reduce((n, s) => n + s.signups, 0), paidSeats: t.paidSeats };
}

export async function notifyElementalSignup(
  input: Registration,
  team: { name: string } | null,
  amountBaht: number,
): Promise<void> {
  try {
    const t = await totals();
    await postHackathonWebhook(
      buildSignupPayload({
        signupNumber: t.signups,
        members: input.members.map((m) => ({
          name: m.nickname || m.fullName.split(" ")[0],
          school: m.school,
        })),
        teamMode: input.teamMode,
        teamName: team?.name ?? null,
        amountBaht,
        source: input.source ?? null,
        paidSeats: t.paidSeats,
      }),
    );
  } catch (error) {
    console.error("[elemental] sign-up ping failed", error);
  }
}

export async function notifyElementalPaid(registrationId: string, via: "slip" | "admin"): Promise<void> {
  try {
    const [reg, t] = await Promise.all([getRegistrationForNotice(registrationId), totals()]);
    if (!reg || reg.status !== "paid") return;
    await postHackathonWebhook(buildPaidPayload({ ...reg, paidSeats: t.paidSeats, via }));
  } catch (error) {
    console.error("[elemental] paid ping failed", error);
  }
}
