import { NextResponse } from "next/server";

import { safeServerError } from "@/lib/security/route-guards";
import { COMMUNITY_SIGNUP_WINDOW_HOURS, communitySignupSchema } from "@/lib/shift/feedback";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Step 2 of /shift/feedback: the community sign-up, saved onto the row step 1
 * created. No login, like the form; the row's random UUID is only returned to
 * the browser that submitted it, and only this one column can change, for a
 * day after submitting.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = communitySignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid choice" }, { status: 422 });
  }

  const { id, communitySignup } = parsed.data;
  const since = new Date(Date.now() - COMMUNITY_SIGNUP_WINDOW_HOURS * 3_600_000).toISOString();

  try {
    const { data, error } = await createAdminClient()
      .from("shift_feedback")
      .update({ community_signup: communitySignup })
      .eq("id", id)
      .gte("created_at", since)
      .select("id");
    if (error) {
      return safeServerError("Failed to save SHIFT community sign-up", error);
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return safeServerError("Failed to save SHIFT community sign-up", error);
  }
}
