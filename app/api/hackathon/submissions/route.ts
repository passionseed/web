import { NextRequest, NextResponse } from "next/server";
import { getSessionParticipant } from "@/lib/hackathon/db";
import { createClient } from "@supabase/supabase-js";

function getHackathonAuthClient() {
  const url = process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getHackathonAuthClient();
  const participant = await getSessionParticipant(token, supabase);
  if (!participant) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activityIds = searchParams.get("activityIds")?.split(",").filter(Boolean) ?? [];

  if (activityIds.length === 0) {
    return NextResponse.json({ submissions: [] });
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

  return NextResponse.json({ submissions });
}
