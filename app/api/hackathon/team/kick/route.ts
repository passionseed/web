import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { participantId } = await req.json();
    if (!participantId) return NextResponse.json({ error: "participantId is required" }, { status: 400 });
    if (participantId === participant.id) return NextResponse.json({ error: "Cannot kick yourself" }, { status: 400 });

    const supabase = getClient();

    // Verify requester is team owner
    const { data: membership } = await supabase
      .from("hackathon_team_members")
      .select("team_id, hackathon_teams(owner_id)")
      .eq("participant_id", participant.id)
      .single();

    if (!membership) return NextResponse.json({ error: "You are not in a team" }, { status: 400 });

    const team = membership.hackathon_teams as { owner_id: string } | null;
    if (!team || team.owner_id !== participant.id) {
      return NextResponse.json({ error: "Only the team owner can kick members" }, { status: 403 });
    }

    const teamId = membership.team_id;

    // Verify target is in the same team
    const { data: targetMembership } = await supabase
      .from("hackathon_team_members")
      .select("team_id")
      .eq("participant_id", participantId)
      .eq("team_id", teamId)
      .single();

    if (!targetMembership) return NextResponse.json({ error: "Member not found in your team" }, { status: 404 });

    // Remove the member
    const { error: removeError } = await supabase
      .from("hackathon_team_members")
      .delete()
      .eq("participant_id", participantId)
      .eq("team_id", teamId);

    if (removeError) {
      console.error("Kick error:", removeError);
      return NextResponse.json({ error: "Failed to kick member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kick unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
