import { NextResponse, after } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { shiftInterestSchema, toInterestErrors } from "@/lib/shift/interest";
import { listShiftInterest, saveShiftInterest, topWindows } from "@/lib/shift/interestStore";
import { notifyShiftInterest } from "@/lib/shift/notifyInterest";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Public SHIFT pre-order intake for /shift/next. No login, same reasons as
 * /api/shift/apply: it is opened from the Instagram in-app browser. Nobody
 * pays here; the row only says which date ranges this person is free.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // One day of grace so a form opened before Bangkok midnight still fits.
  const parsed = shiftInterestSchema(bangkokToday(), 1).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid sign-up", fields: toInterestErrors(parsed.error) },
      { status: 422 },
    );
  }

  const interest = parsed.data;
  if (interest.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = createAdminClient();
    const { existed } = await saveShiftInterest(supabase, interest);

    after(async () => {
      let topWindow = null;
      try {
        topWindow = topWindows(await listShiftInterest(supabase), 1)[0] ?? null;
      } catch (error) {
        console.error("[shift] interest demand failed", error);
      }
      await notifyShiftInterest({ interest, updated: existed, topWindow });
    });

    // Same reply either way, so the form cannot reveal who already signed up.
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save SHIFT interest", error);
  }
}
