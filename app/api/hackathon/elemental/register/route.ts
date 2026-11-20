import { NextRequest, NextResponse } from "next/server";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import {
  elementalPriceBaht,
  elementalRegistrationOpen,
  normalizeSource,
  registrationSchema,
} from "@/lib/hackathon/elemental/registration";
import { safeServerError } from "@/lib/security/route-guards";
import { createRegistration } from "@/lib/supabase/hackathon-event-registrations";

/** Save an Elemental sign-up and return the pay page's token. */
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
  const amount = elementalPriceBaht(input.members.length);

  try {
    const { payToken } = await createRegistration(ELEMENTAL.slug, input, amount);
    return NextResponse.json({ payToken, amountBaht: amount });
  } catch (error) {
    return safeServerError("Failed to save registration", error);
  }
}
