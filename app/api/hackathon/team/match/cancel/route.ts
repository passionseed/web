import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const participant = await getSessionParticipant(token);
    if (!participant) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const supabase = await createClient();

    // Update waitlist status to cancelled
    const { error: updateError } = await supabase
      .from("hackathon_team_matching_waitlist")
      .update({ status: "cancelled" })
      .eq("participant_id", participant.id)
      .eq("status", "waiting");

    if (updateError) {
      console.error("Error cancelling waitlist:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel waitlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to cancel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
