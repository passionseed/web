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

    // Get current team
    const { data: membership } = await supabase
      .from("hackathon_team_members")
      .select("team_id, hackathon_teams(id, owner_id)")
      .eq("participant_id", participant.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "You are not in a team" }, { status: 400 });
    }

    const teamId = membership.team_id;

    // Remove from team
    const { error: removeError } = await supabase
      .from("hackathon_team_members")
      .delete()
      .eq("participant_id", participant.id)
      .eq("team_id", teamId);

    if (removeError) {
      console.error("Error removing from team:", removeError);
      return NextResponse.json({ error: "Failed to leave team" }, { status: 500 });
    }

    // Check if team is now empty
    const { count } = await supabase
      .from("hackathon_team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);

    // If team is empty, delete it
    if (count === 0) {
      const { error: deleteError } = await supabase
        .from("hackathon_teams")
        .delete()
        .eq("id", teamId);

      if (deleteError) {
        console.error("Error deleting empty team:", deleteError);
        // Not critical, just log it
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to leave team";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
