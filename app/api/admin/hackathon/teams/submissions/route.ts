import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { buildActivityCommentsByActivity } from "@/lib/hackathon/activity-comments";

const TEST_TEAM_NAMES = ["Test6EDSCMU", "TEst2U4SU5F"];
const PAGE_SIZE = 20;

function getServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    const serviceClient = getServiceClient();

    const [teamsResult, teamSubsResult, individualSubsResult, commentsResult, repliesResult, teamScoresResult] =
      await Promise.all([
        serviceClient
          .from("hackathon_teams")
          .select(`
            id, name, lobby_code, owner_id,
            hackathon_team_members(participant_id, hackathon_participants(id, name, email, university))
          `),
        // Slim: exclude text_answer for list view
        serviceClient
          .from("hackathon_phase_activity_team_submissions")
          .select(`
            id, team_id, activity_id, assessment_id, status, image_url, file_urls, submitted_at, submitted_by,
            hackathon_participants!submitted_by(name),
            hackathon_phase_activity_assessments!assessment_id(id, metadata, display_order,
              hackathon_phase_activities(title, display_order, phase_id, hackathon_program_phases(id, title, phase_number)))
          `),
        // Slim: exclude text_answer for list view
        serviceClient
          .from("hackathon_phase_activity_submissions")
          .select(`
            id, participant_id, activity_id, assessment_id, status, image_url, file_urls, submitted_at,
            hackathon_participants!participant_id(name),
            hackathon_phase_activity_assessments!assessment_id(id, metadata, display_order,
              hackathon_phase_activities(title, display_order, phase_id, hackathon_program_phases(id, title, phase_number)))
          `),
        serviceClient
          .from("hackathon_activity_comments")
          .select(`
            id, activity_id, participant_id, content, engagement_score, created_at, updated_at, is_edited,
            hackathon_participants(name, display_name, avatar_url)
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),
        serviceClient
          .from("hackathon_activity_comment_replies")
          .select(`
            id, comment_id, participant_id, content, created_at, updated_at, is_edited,
            hackathon_participants(name, display_name, avatar_url)
          `)
          .is("deleted_at", null)
          .order("created_at", { ascending: true }),
        serviceClient
          .from("hackathon_team_scores")
          .select("team_id, total_score"),
      ]);

    if (
      teamsResult.error || teamSubsResult.error ||
      individualSubsResult.error || commentsResult.error || repliesResult.error
    ) {
      console.error("Error fetching admin team submissions:", {
        teams: teamsResult.error,
        teamSubmissions: teamSubsResult.error, individualSubmissions: individualSubsResult.error,
        comments: commentsResult.error, replies: repliesResult.error,
      });
      return NextResponse.json({ error: "Failed to fetch hackathon team submissions" }, { status: 500 });
    }

    const teams = teamsResult.data ?? [];
    const teamSubs = teamSubsResult.data ?? [];
    const individualSubs = individualSubsResult.data ?? [];
    const commentsByActivityId = buildActivityCommentsByActivity(
      commentsResult.data ?? [],
      repliesResult.data ?? []
    );

    // Build score lookup from hackathon_team_scores (single source of truth)
    const scoreByTeamId = new Map<string, number>(
      (teamScoresResult.data ?? []).map((s: { team_id: string; total_score: number }) => [s.team_id, s.total_score])
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
        const assessment = s.hackathon_phase_activity_assessments as unknown as {
          id: string;
          metadata: Record<string, string> | null;
          display_order: number;
          hackathon_phase_activities?: {
            title: string; display_order: number; phase_id: string;
            hackathon_program_phases?: { id: string; title: string; phase_number: number } | null;
          } | null;
        } | null;
        const activity = assessment?.hackathon_phase_activities ?? null;
        const prompt = assessment?.metadata?.prompt ?? assessment?.metadata?.submission_label ?? null;
        return {
          id: s.id, activity_id: s.activity_id, assessment_id: assessment?.id ?? null, prompt,
          activity_title: activity?.title ?? null,
          activity_display_order: activity?.display_order ?? null,
          phase_id: activity?.phase_id ?? null,
          phase_title: activity?.hackathon_program_phases?.title ?? null,
          phase_number: activity?.hackathon_program_phases?.phase_number ?? null,
          status: s.status,
          image_url: s.image_url ?? null,
          file_urls: s.file_urls ?? [],
          submitted_at: s.submitted_at ?? null,
          submitted_by_name: (s.hackathon_participants as unknown as { name: string } | null)?.name ?? null,
        };
      });

      const formattedIndividualSubs = memberParticipantIds.flatMap((pid: string) => {
        const subs = individualSubsByParticipantId.get(pid) ?? [];
        return subs.map((s) => {
          const assessment = s.hackathon_phase_activity_assessments as unknown as {
            id: string;
            metadata: Record<string, string> | null;
            display_order: number;
            hackathon_phase_activities?: {
              title: string; display_order: number; phase_id: string;
              hackathon_program_phases?: { id: string; title: string; phase_number: number } | null;
            } | null;
          } | null;
          const activity = assessment?.hackathon_phase_activities ?? null;
          const prompt = assessment?.metadata?.prompt ?? assessment?.metadata?.submission_label ?? null;
          return {
            id: s.id, participant_id: pid, activity_id: s.activity_id, assessment_id: assessment?.id ?? null, prompt,
            activity_title: activity?.title ?? null,
            activity_display_order: activity?.display_order ?? null,
            phase_id: activity?.phase_id ?? null,
            phase_title: activity?.hackathon_program_phases?.title ?? null,
            phase_number: activity?.hackathon_program_phases?.phase_number ?? null,
            participant_name: (s.hackathon_participants as unknown as { name: string } | null)?.name ?? null,
            status: s.status,
            image_url: s.image_url ?? null,
            file_urls: s.file_urls ?? [],
            submitted_at: s.submitted_at ?? null,
          };
        });
      });

      const memberCount = members.length;
      const totalScore = scoreByTeamId.get(team.id) ?? 0;

      return {
        id: team.id, name: team.name, lobby_code: team.lobby_code, owner_id: team.owner_id,
        member_count: memberCount, members,
        total_score: totalScore,
        team_submissions: formattedTeamSubs, individual_submissions: formattedIndividualSubs,
      };
    });

    assembled.sort((a, b) => b.total_score - a.total_score);

    const filtered = assembled.filter(
      (team) => !TEST_TEAM_NAMES.includes(team.name)
    );

    // Only include teams with submissions
    const teamsWithSubs = filtered.filter(
      (t) => t.team_submissions.length > 0 || t.individual_submissions.length > 0
    );

    // Paginate teams
    const totalItems = teamsWithSubs.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * PAGE_SIZE;
    const paginatedTeams = teamsWithSubs.slice(offset, offset + PAGE_SIZE);

    // Only include comments for activities in the paginated teams
    const activityIdsInPage = new Set<string>();
    for (const t of paginatedTeams) {
      for (const s of t.team_submissions) activityIdsInPage.add(s.activity_id);
      for (const s of t.individual_submissions) activityIdsInPage.add(s.activity_id);
    }

    const filteredComments: Record<string, unknown> = {};
    for (const actId of activityIdsInPage) {
      if (commentsByActivityId[actId]) {
        filteredComments[actId] = commentsByActivityId[actId];
      }
    }

    return NextResponse.json({
      teams: paginatedTeams,
      activity_comments_by_id: filteredComments,
      pagination: {
        page: safePage,
        page_size: PAGE_SIZE,
        total_items: totalItems,
        total_pages: totalPages,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Error in hackathon submissions API:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
