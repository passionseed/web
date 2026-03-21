import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/hackathon/auth";
import { getSessionParticipant, getParticipantTeam } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const participant = await getSessionParticipant(token);
    if (!participant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const team = await getParticipantTeam(participant.id);
    if (!team) return NextResponse.json({ interests: [] });

    const memberIds = team.members.map((m) => m.participant_id);

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("hackathon_pre_questionnaires")
      .select("participant_id, name, problem_preferences, team_role_preference")
      .in("participant_id", memberIds);

    if (error) {
      console.error("Error fetching team interests:", error);
      return NextResponse.json({ interests: [] });
    }

    return NextResponse.json({ interests: data ?? [] });
  } catch (error) {
    console.error("Error in team interests:", error);
    return NextResponse.json({ interests: [] });
  }
}
