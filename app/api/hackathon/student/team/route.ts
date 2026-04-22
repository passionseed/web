import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { getCorsHeaders, extractHackathonToken } from "@/lib/hackathon/auth";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/hackathon/student/team
// Returns team info + member count for the authenticated participant.
// { team: null } if no team.
export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);

  const token = extractHackathonToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  const supabase = getClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) {
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401, headers: corsHeaders }
    );
  }

  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  if (!membership?.team_id) {
    return NextResponse.json(
      { team: null, member_count: 0 },
      { headers: corsHeaders }
    );
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

  return NextResponse.json(
    {
      team,
      member_count: members?.length ?? 0,
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
