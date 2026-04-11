import { NextRequest, NextResponse } from "next/server";
import { getMentorBySessionToken, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getClient();

  // Fetch all teams, assigned teams, and all submissions in parallel
  const [teamsResult, assignmentsResult, teamSubsResult, individualSubsResult] =
    await Promise.all([
      db.from("hackathon_teams").select(`
        id, name, lobby_code, owner_id,
        hackathon_team_members(
          participant_id,
          hackathon_participants(id, name, email, university)
        )
      `),

      db.from("mentor_team_assignments")
        .select("id, team_id, assigned_at")
        .eq("mentor_id", mentor.id),

      db.from("hackathon_phase_activity_team_submissions").select(`
        id, team_id, activity_id, assessment_id, status,
        text_answer, image_url, file_urls, submitted_at, submitted_by,
        hackathon_phase_activities(title),
        hackathon_participants(name),
        hackathon_phase_activity_assessments(id, metadata)
      `),

      db.from("hackathon_phase_activity_submissions").select(`
        id, participant_id, activity_id, assessment_id, status,
        text_answer, image_url, file_urls, submitted_at,
        hackathon_phase_activities(title),
        hackathon_participants(name),
        hackathon_phase_activity_assessments(id, metadata)
      `),
    ]);

  if (teamsResult.error) {
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }

  const assignedTeamIds = new Set(
    (assignmentsResult.data ?? []).map((a: { team_id: string }) => a.team_id)
  );

  // Build submission lookups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamSubsByTeamId = new Map<string, any[]>();
  for (const s of teamSubsResult.data ?? []) {
    const arr = teamSubsByTeamId.get(s.team_id) ?? [];
    arr.push(s);
    teamSubsByTeamId.set(s.team_id, arr);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const individualSubsByParticipantId = new Map<string, any[]>();
  for (const s of individualSubsResult.data ?? []) {
    const arr = individualSubsByParticipantId.get(s.participant_id) ?? [];
    arr.push(s);
    individualSubsByParticipantId.set(s.participant_id, arr);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractPrompt(assessment: any): string | null {
    return assessment?.metadata?.prompt ?? assessment?.metadata?.submission_label ?? null;
  }

  // Assemble teams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTeams = (teamsResult.data ?? []).map((team: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = (team.hackathon_team_members ?? []).filter((m: any) => m.hackathon_participants != null).map((m: any, idx: number) => ({
      participant_id: m.participant_id as string,
      name: m.hackathon_participants.name as string,
      email: m.hackathon_participants.email as string,
      university: m.hackathon_participants.university as string,
      is_owner: m.participant_id === team.owner_id,
      idx,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberIds = members.map((m: any) => m.participant_id as string);

    const rawTeamSubs = teamSubsByTeamId.get(team.id) ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamSubmissions = rawTeamSubs.map((s: any) => ({
      id: s.id,
      activity_id: s.activity_id,
      activity_title: s.hackathon_phase_activities?.title ?? null,
      assessment_id: s.hackathon_phase_activity_assessments?.id ?? null,
      prompt: extractPrompt(s.hackathon_phase_activity_assessments),
      status: s.status,
      text_answer: s.text_answer ?? null,
      image_url: s.image_url ?? null,
      file_urls: s.file_urls ?? [],
      submitted_at: s.submitted_at ?? null,
      submitted_by_name: s.hackathon_participants?.name ?? null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const individualSubmissions = memberIds.flatMap((pid: string) =>
      (individualSubsByParticipantId.get(pid) ?? []).map((s: any) => ({
        id: s.id,
        participant_id: pid,
        participant_name: s.hackathon_participants?.name ?? null,
        activity_id: s.activity_id,
        activity_title: s.hackathon_phase_activities?.title ?? null,
        assessment_id: s.hackathon_phase_activity_assessments?.id ?? null,
        prompt: extractPrompt(s.hackathon_phase_activity_assessments),
        status: s.status,
        text_answer: s.text_answer ?? null,
        image_url: s.image_url ?? null,
        file_urls: s.file_urls ?? [],
        submitted_at: s.submitted_at ?? null,
      }))
    );

    return {
      id: team.id,
      name: team.name,
      lobby_code: team.lobby_code,
      owner_id: team.owner_id,
      member_count: members.length,
      members,
      is_assigned: assignedTeamIds.has(team.id),
      team_submissions: teamSubmissions,
      individual_submissions: individualSubmissions,
    };
  });

  return NextResponse.json({ teams: allTeams });
}
