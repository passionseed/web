import { NextRequest, NextResponse } from "next/server";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders, extractHackathonToken } from "@/lib/hackathon/auth";

function getHackathonAuthClient() {
  const url = process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const token = extractHackathonToken(req);

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const supabase = getHackathonAuthClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401, headers: corsHeaders });

  const { searchParams } = new URL(req.url);
  const activityIds = searchParams.get("activityIds")?.split(",").filter(Boolean) ?? [];

  if (activityIds.length === 0) {
    return NextResponse.json({ submissions: [] }, { headers: corsHeaders });
  }

  // Get participant's team (if any)
  const { data: membership } = await supabase
    .from("hackathon_team_members")
    .select("team_id")
    .eq("participant_id", participant.id)
    .maybeSingle();

  const teamId = (membership as any)?.team_id ?? null;

  // Fetch individual + team submissions in parallel
  const [{ data: individualData }, { data: teamData }] = await Promise.all([
    supabase
      .from("hackathon_phase_activity_submissions")
      .select("activity_id, status")
      .eq("participant_id", participant.id)
      .in("activity_id", activityIds),
    teamId
      ? supabase
          .from("hackathon_phase_activity_team_submissions")
          .select("activity_id, status")
          .eq("team_id", teamId)
          .in("activity_id", activityIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Merge: team submission takes precedence for team-scoped activities
  const merged = new Map<string, string>();
  for (const s of individualData ?? []) merged.set(s.activity_id, s.status);
  for (const s of teamData ?? []) merged.set(s.activity_id, s.status);

  const submissions = Array.from(merged.entries()).map(([activity_id, status]) => ({ activity_id, status }));

  return NextResponse.json({ submissions }, { headers: corsHeaders });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
