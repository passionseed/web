import { createHash } from "crypto";

import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { checkRateLimit } from "@/lib/expert-interview/rate-limiter";
import { clientIp } from "@/lib/hackathon/elemental/link-views";
import { sendMyPageEmail } from "@/lib/hackathon/elemental/registration-email";
import { parseTeamCode } from "@/lib/hackathon/elemental/team-change";
import { safeServerError } from "@/lib/security/route-guards";
import { isTrustedAdminRequest } from "@/lib/security/request-origin";
import { payTokensForEmail } from "@/lib/supabase/hackathon-event-registrations";

/** Asks from one network in an hour. The per-address email limit (3 an hour) applies on top. */
const PER_IP_PER_HOUR = 10;

const body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  /** The team link's code, so the emailed page opens with that team ready to join. */
  team: z.string().max(40).optional(),
});

/**
 * "Send me my page link" from a friend's team link, for someone who already
 * signed up on another device (Big, 2026-11-28). The answer is the same
 * whether or not the address signed up, and the email is sent after the
 * answer, so neither the words nor the timing say who has signed up.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isTrustedAdminRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

    const ipKey = createHash("sha256").update(`elemental-my-page:ip:${clientIp(request.headers)}`).digest("hex");
    const { allowed } = await checkRateLimit(ipKey, PER_IP_PER_HOUR);
    if (!allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

    const { email, team } = parsed.data;
    const joinCode = team ? parseTeamCode(team) : null;
    after(async () => {
      try {
        const payTokens = await payTokensForEmail(ELEMENTAL.slug, email);
        await sendMyPageEmail({ to: email, payTokens, joinCode });
      } catch (error) {
        console.error("[elemental my-page] lookup or email failed", error instanceof Error ? error.message : error);
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Could not send the page link", error);
  }
}
