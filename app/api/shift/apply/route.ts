import { NextResponse, after } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { SHIFT_COHORT, cohortStatus, getShiftCohort } from "@/lib/content/shift-cohort";
import { shiftApplicationSchema, toFieldErrors } from "@/lib/shift/application";
import { newShiftJoinToken, shiftJoinPath } from "@/lib/shift/joinLink";
import { notifyShiftApplication } from "@/lib/shift/notifyDiscord";
import { SHIFT_NOTICE_VERSION, applicantNeedsParent } from "@/lib/shift/parentConsent";
import { newShiftParentLink, sendShiftParentEmail } from "@/lib/shift/parentConsentServer";
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

  const cohort =
    application.round === undefined ? SHIFT_COHORT : getShiftCohort(application.round);
  if (!cohort) {
    return NextResponse.json({ error: "Unknown SHIFT round" }, { status: 422 });
  }
  // The page only shows the form while a round is open. Enforced here too,
  // because the join link it returns now grants the round's Discord role.
  if (cohortStatus(cohort) !== "open") {
    return NextResponse.json({ error: "SHIFT round closed" }, { status: 409 });
  }

  try {
    const supabase = createAdminClient();
    // Minted now so the applicant's LINE payment message already carries their
    // personal Discord link. It stays inert until an admin marks them paid.
    const joinToken = newShiftJoinToken();
    // Under 20 the parent must agree before the seat is confirmed (PDPA
    // s.20). Only the hash is stored; the raw link goes out by email.
    const parentLink = applicantNeedsParent(application.birthDate) ? newShiftParentLink() : null;
    const row = {
      cohort: cohort.name,
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
      join_token: joinToken,
      birth_date: application.birthDate,
      consent_notice_version: SHIFT_NOTICE_VERSION,
      parent_email: application.parentEmail,
      parent_token_hash: parentLink?.hash ?? null,
    };
    const table = supabase.from("shift_applications");
    let { error } = await table.insert({ ...row, found_via: application.foundVia });
    // found_via (20261024130000) not applied yet: keep the application
    // rather than losing it over the new question.
    if (error?.code === "PGRST204") {
      console.warn("shift_applications.found_via missing; saving without it", error.message);
      ({ error } = await table.insert(row));
    }
    if (error) {
      return safeServerError("Failed to save SHIFT application", error);
    }

    // Runs after the response is sent, so the applicant never waits on Discord or email.
    after(async () => {
      if (parentLink) {
        await sendShiftParentEmail(
          {
            cohort: cohort.name,
            nickname: application.nickname,
            full_name: application.fullName,
            parent_email: application.parentEmail,
          },
          parentLink.token,
        ).catch((emailError) => console.error("[shift] parent email failed", emailError));
      }

      let applicationNumber: number | null = null;
      try {
        const { count, error: countError } = await supabase
          .from("shift_applications")
          .select("id", { count: "exact", head: true })
          .eq("cohort", cohort.name);
        if (countError) console.error("[shift] application count failed", countError);
        else applicationNumber = count;
      } catch (countError) {
        console.error("[shift] application count failed", countError);
      }

      await notifyShiftApplication({
        cohortName: cohort.name,
        seats: cohort.seats,
        applicationNumber,
        application,
      });
    });

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const joinUrl = new URL(shiftJoinPath(joinToken), origin).toString();
    return NextResponse.json({ ok: true, joinUrl });
  } catch (error) {
    return safeServerError("Failed to save SHIFT application", error);
  }
}
