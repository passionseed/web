import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { SHIFT_COHORT } from "@/lib/content/shift-cohort";
import { shiftApplicationSchema, toFieldErrors } from "@/lib/shift/application";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Public SHIFT application intake. No login: the form is opened from the
 * Instagram in-app browser, where a sign-in wall loses most applicants.
 * The table is admin-only under RLS, so the insert uses the service role
 * after the payload passes the shared schema.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = shiftApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid application", fields: toFieldErrors(parsed.error) },
      { status: 422 },
    );
  }

  const application = parsed.data;
  // Honeypot filled: pretend success so bots learn nothing.
  if (application.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("shift_applications").insert({
      cohort: SHIFT_COHORT.name,
      full_name: application.fullName,
      nickname: application.nickname,
      grade: application.grade,
      target_track: application.targetTrack,
      problem: application.problem,
      availability: application.availability,
      ig_handle: application.igHandle,
      discord_handle: application.discordHandle,
      parent_contact: application.parentContact,
      consent: application.consent,
      source: application.source,
    });
    if (error) {
      return safeServerError("Failed to save SHIFT application", error);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save SHIFT application", error);
  }
}
