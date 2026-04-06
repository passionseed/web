import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

const TEAM_OPERATIONS_LOCKED = true;

export async function POST() {
  if (TEAM_OPERATIONS_LOCKED) {
    return NextResponse.json({ error: "การจับคู่ทีมถูกปิดชั่วคราว" }, { status: 403 });
  }
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

    // Check if participant is already in a team
    const { data: existingMembership } = await supabase
      .from("hackathon_team_members")
      .select("team_id")
      .eq("participant_id", participant.id)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: "คุณอยู่ในทีมแล้ว" },
        { status: 400 }
      );
    }

    // Check if already in waitlist
    const { data: existingWaitlist } = await supabase
      .from("hackathon_team_matching_waitlist")
      .select("id, status")
      .eq("participant_id", participant.id)
      .eq("status", "waiting")
      .single();

    if (existingWaitlist) {
      return NextResponse.json(
        { message: "Already in waitlist", waitlist: existingWaitlist },
        { status: 200 }
      );
    }

    // Add to waitlist
    const { data: waitlist, error: waitlistError } = await supabase
      .from("hackathon_team_matching_waitlist")
      .insert({
        participant_id: participant.id,
        status: "waiting",
      })
      .select()
      .single();

    if (waitlistError) {
      console.error("Error adding to waitlist:", waitlistError);
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ waitlist }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to join waitlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
