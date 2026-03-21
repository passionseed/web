import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(_request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { error: stateError } = await admin
    .from("onboarding_state")
    .delete()
    .eq("user_id", user.id);

  if (stateError) {
    console.error("[onboarding/reset] state error", stateError);
    return NextResponse.json({ error: "Failed to reset state" }, { status: 500 });
  }

  const { error: goalsError } = await admin
    .from("career_goals")
    .delete()
    .eq("user_id", user.id);

  if (goalsError) {
    console.error("[onboarding/reset] career goals error", goalsError);
    return NextResponse.json({ error: "Failed to reset goals" }, { status: 500 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      is_onboarded: false,
      onboarded_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("[onboarding/reset] profile error", profileError);
    return NextResponse.json({ error: "Failed to reset profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
