import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const sc = getServiceClient();

    const [teamsResult, scoresResult] = await Promise.all([
      sc.from("hackathon_teams")
        .select(`
          id, name, lobby_code, owner_id, created_at,
          hackathon_team_members(
            joined_at, participant_id,
            hackathon_participants(id, name, email, university, created_at, phone, line_id, discord_username, instagram_handle, grade_level, track, password_hash)
          )
        `)
        .order("created_at", { ascending: false }),
      sc.from("hackathon_team_scores").select("team_id, total_score"),
    ]);

    if (teamsResult.error) {
      return safeServerError("Failed to fetch teams", teamsResult.error);
    }

    const scoreMap = new Map(
      (scoresResult.data ?? []).map((s: { team_id: string; total_score: number }) => [s.team_id, s.total_score])
    );

    const teams = (teamsResult.data ?? []).map((team: Record<string, unknown>) => ({
      ...team,
      total_score: scoreMap.get(team.id as string) ?? 0,
    }));

    return NextResponse.json({ teams });
  } catch (err) {
    return safeServerError("Failed to fetch teams", err);
  }
}
