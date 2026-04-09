import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionParticipant } from "@/lib/hackathon/db";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// GET /api/hackathon/student/team
// Returns team info + member count for the authenticated participant.
// { team: null } if no team.
export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (!membership?.team_id) {
    return NextResponse.json({ team: null, member_count: 0 });
  }

  const { data: members } = await supabase
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", membership.team_id);

  const { data: team } = await supabase
    .from("hackathon_teams")
    .select("id, name")
    .eq("id", membership.team_id)
    .maybeSingle();

  return NextResponse.json({
    team,
    member_count: members?.length ?? 0,
  });
}
