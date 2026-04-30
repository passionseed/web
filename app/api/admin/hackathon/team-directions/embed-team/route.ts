import { NextResponse } from "next/server";
import { createTeamDirectionSnapshot, collectTeamText } from "@/lib/embeddings/team-direction";

async function requireAdminUser() {
  const { createClient } = await import("@/utils/supabase/server");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin");

  return roles?.length ? user : null;
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  try {
    const { teamId: rawId, dryRun } = await request.json();
    if (!rawId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    // Accept both UUID and lobby code
    let teamId = rawId.trim();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId);
    if (!isUUID) {
      const { getHackathonClient } = await import("@/lib/embeddings/hackathon-client");
      const { data: team } = await getHackathonClient()
        .from("hackathon_teams")
        .select("id")
        .eq("lobby_code", teamId)
        .maybeSingle();
      if (!team) {
        return NextResponse.json({ error: `No team found with lobby code "${teamId}"` }, { status: 404 });
      }
      teamId = team.id;
    }

    console.log("[embed-team] Processing team:", teamId);

    if (dryRun) {
      const text = await collectTeamText(teamId);
      // Also return raw counts for debugging
      const { getHackathonClient } = await import("@/lib/embeddings/hackathon-client");
      const hc = getHackathonClient();
      const { data: teamSubs, count: teamSubCount } = await hc
        .from("hackathon_phase_activity_team_submissions")
        .select("id, status, text_answer", { count: "exact" })
        .eq("team_id", teamId);
      const { data: members } = await hc
        .from("hackathon_team_members")
        .select("participant_id")
        .eq("team_id", teamId);
      const pids = (members ?? []).map((m: { participant_id: string }) => m.participant_id);
      const { count: indivCount } = pids.length > 0
        ? await hc.from("hackathon_phase_activity_submissions").select("id", { count: "exact" }).in("participant_id", pids)
        : { count: 0 };
      // Also check the other submission tables
      const { count: altTeamCount } = await hc.from("hackathon_activity_team_submissions").select("id", { count: "exact" }).eq("team_id", teamId);
      const { count: altIndivCount } = pids.length > 0
        ? await hc.from("hackathon_activity_individual_submissions").select("id", { count: "exact" }).in("participant_id", pids)
        : { count: 0 };
      return NextResponse.json({
        dryRun: true, teamId, textLength: text.length, text,
        debug: {
          members: pids.length,
          phase_team_subs: teamSubCount,
          phase_team_subs_detail: (teamSubs ?? []).map((s: any) => ({ status: s.status, hasText: Boolean(s.text_answer?.trim()), len: (s.text_answer ?? "").length })),
          phase_indiv_subs: indivCount,
          activity_team_subs: altTeamCount,
          activity_indiv_subs: altIndivCount,
        },
      });
    }

    const snapshot = await createTeamDirectionSnapshot(teamId);
    
    return NextResponse.json({
      success: true,
      snapshotId: snapshot.id,
      teamId: snapshot.team_id,
      profile: snapshot.profile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[embed-team] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
