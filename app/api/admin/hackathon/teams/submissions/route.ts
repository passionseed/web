import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const serviceClient = getServiceClient();

    // Run all 4 queries in parallel
    const [teamsResult, scoresResult, teamSubsResult, individualSubsResult] =
      await Promise.all([
        // 1. All teams with members
        serviceClient
          .from("hackathon_teams")
          .select(`
            id,
            name,
            lobby_code,
            owner_id,
            hackathon_team_members(
              participant_id,
              hackathon_participants(
                id,
                name,
                email,
                university
              )
            )
          `),

        // 2. All team scores
        serviceClient
          .from("hackathon_team_scores")
          .select("team_id, total_score"),

        // 3. All team submissions with activity title, submitter name, and assessment prompt
        serviceClient
          .from("hackathon_phase_activity_team_submissions")
          .select(`
            id,
            team_id,
            activity_id,
            assessment_id,
            status,
            text_answer,
            image_url,
            file_urls,
            submitted_at,
            submitted_by,
            hackathon_phase_activities(title),
            hackathon_participants(name),
            hackathon_phase_activity_assessments(id, metadata, display_order)
          `),

        // 4. All individual submissions with activity title and assessment prompt
        serviceClient
          .from("hackathon_phase_activity_submissions")
          .select(`
            id,
            participant_id,
            activity_id,
            assessment_id,
            status,
            text_answer,
            image_url,
            file_urls,
            submitted_at,
            hackathon_phase_activities(title),
            hackathon_participants(name),
            hackathon_phase_activity_assessments(id, metadata, display_order)
          `),
      ]);

    if (teamsResult.error) {
      console.error("Error fetching teams:", teamsResult.error);
      return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
    }

    const teams = teamsResult.data ?? [];
    const scores = scoresResult.data ?? [];
    const teamSubs = teamSubsResult.data ?? [];
    const individualSubs = individualSubsResult.data ?? [];

    // Build lookup maps for O(1) access
    const scoreByTeamId = new Map(
      scores.map((s: { team_id: string; total_score: number }) => [s.team_id, s.total_score])
    );

    const teamSubsByTeamId = new Map<string, typeof teamSubs>();
    for (const sub of teamSubs) {
      const existing = teamSubsByTeamId.get(sub.team_id) ?? [];
      existing.push(sub);
      teamSubsByTeamId.set(sub.team_id, existing);
    }

    const individualSubsByParticipantId = new Map<string, typeof individualSubs>();
    for (const sub of individualSubs) {
      const existing = individualSubsByParticipantId.get(sub.participant_id) ?? [];
      existing.push(sub);
      individualSubsByParticipantId.set(sub.participant_id, existing);
    }

    // Assemble each team's response shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assembled = teams.map((team: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const members = (team.hackathon_team_members ?? []).filter((m: any) => m.hackathon_participants != null).map((m: any) => ({
        participant_id: m.participant_id as string,
        name: m.hackathon_participants.name as string,
        email: m.hackathon_participants.email as string,
        university: m.hackathon_participants.university as string,
        is_owner: m.participant_id === team.owner_id,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberParticipantIds = (team.hackathon_team_members ?? []).map((m: any) => m.participant_id as string).filter(Boolean);

      const rawTeamSubs = teamSubsByTeamId.get(team.id) ?? [];
      const formattedTeamSubs = rawTeamSubs.map((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assessment = s.hackathon_phase_activity_assessments as unknown as { id: string; metadata: Record<string, string> | null; display_order: number } | null;
        const prompt = assessment?.metadata?.prompt ?? assessment?.metadata?.submission_label ?? null;
        return {
          id: s.id,
          activity_id: s.activity_id,
          assessment_id: assessment?.id ?? null,
          prompt,
          activity_title: (s.hackathon_phase_activities as unknown as { title: string } | null)?.title ?? null,
          status: s.status,
          text_answer: s.text_answer ?? null,
          image_url: s.image_url ?? null,
          file_urls: s.file_urls ?? [],
          submitted_at: s.submitted_at ?? null,
          submitted_by_name: (s.hackathon_participants as unknown as { name: string } | null)?.name ?? null,
        };
      });

      const formattedIndividualSubs = memberParticipantIds.flatMap((pid: string) => {
        const subs = individualSubsByParticipantId.get(pid) ?? [];
        return subs.map((s) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const assessment = s.hackathon_phase_activity_assessments as unknown as { id: string; metadata: Record<string, string> | null; display_order: number } | null;
          const prompt = assessment?.metadata?.prompt ?? assessment?.metadata?.submission_label ?? null;
          return {
            id: s.id,
            participant_id: pid,
            activity_id: s.activity_id,
            assessment_id: assessment?.id ?? null,
            prompt,
            activity_title: (s.hackathon_phase_activities as unknown as { title: string } | null)?.title ?? null,
            participant_name: (s.hackathon_participants as unknown as { name: string } | null)?.name ?? null,
            status: s.status,
            text_answer: s.text_answer ?? null,
            image_url: s.image_url ?? null,
            file_urls: s.file_urls ?? [],
            submitted_at: s.submitted_at ?? null,
          };
        });
      });

      return {
        id: team.id,
        name: team.name,
        lobby_code: team.lobby_code,
        owner_id: team.owner_id,
        member_count: members.length,
        members,
        total_score: scoreByTeamId.get(team.id) ?? 0,
        team_submissions: formattedTeamSubs,
        individual_submissions: formattedIndividualSubs,
      };
    });

    // Sort by total_score descending
    assembled.sort((a, b) => b.total_score - a.total_score);

    return NextResponse.json({ teams: assembled });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in hackathon submissions API:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
