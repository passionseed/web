import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { getShiftCohort } from "@/lib/content/shift-cohort";
import {
  FEEDBACK_NOTICE_VERSION,
  shiftFeedbackSchema,
  toFeedbackErrors,
} from "@/lib/shift/feedback";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Public end-of-round SHIFT feedback. No login, same as /api/shift/apply:
 * the link is sent in the LINE group and opened in its in-app browser.
 * The table is admin-only under RLS, so the insert uses the service role.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = shiftFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback", fields: toFeedbackErrors(parsed.error) },
      { status: 422 },
    );
  }

  const feedback = parsed.data;
  // Honeypot filled: pretend success so bots learn nothing.
  if (feedback.website) {
    return NextResponse.json({ ok: true });
  }

  const cohort = getShiftCohort(feedback.round);
  if (!cohort) {
    return NextResponse.json({ error: "Unknown SHIFT round" }, { status: 422 });
  }

  const row = {
    cohort: cohort.name,
    nickname: feedback.nickname,
    satisfaction: feedback.satisfaction,
    can_do_now: feedback.canDoNow,
    confidence: feedback.confidence,
    ownership: feedback.ownership,
    own_decision: feedback.ownDecision,
    motivation: feedback.motivation,
    most_valuable: feedback.mostValuable,
    change_next: feedback.changeNext,
    price_fit: feedback.priceFit,
    payer: feedback.payer,
    recommend: feedback.recommend,
    next_steps: feedback.nextSteps,
    quote_ok: feedback.quoteMode !== "no",
    quote_mode: feedback.quoteMode,
    // Only kept when they asked to be credited by name.
    quote_name: feedback.quoteMode === "named" ? feedback.quoteName : null,
    notice_version: FEEDBACK_NOTICE_VERSION,
    consented_at: new Date().toISOString(),
  };
  const alumniAsk = {
    continue_project: feedback.continueProject,
    continue_project_note: feedback.continueProject === "not_now" ? null : feedback.continueProjectNote,
    available_days: feedback.availableDays,
  };

  try {
    const table = createAdminClient().from("shift_feedback");
    let { error } = await table.insert({ ...row, ...alumniAsk });
    // Columns from 20261014090000 not applied yet: keep the core answers
    // rather than losing the whole submission.
    if (error?.code === "PGRST204") {
      console.warn("shift_feedback alumni columns missing; saving without them", error.message);
      ({ error } = await table.insert(row));
    }
    if (error) {
      return safeServerError("Failed to save SHIFT feedback", error);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save SHIFT feedback", error);
  }
}
