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

    const [teamsResult, teamSubsResult, individualSubsResult, commentsResult, repliesResult, individualReviewsResult, teamReviewsResult, activitiesResult] =
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
        // Fetch passed reviews for individual submissions (with activity scope)
        serviceClient
          .from("hackathon_submission_reviews")
          .select(`
            id, individual_submission_id, team_submission_id, review_status, score_awarded, points_possible,
            hackathon_phase_activity_submissions(participant_id, activity_id)
          `)
          .eq("review_status", "passed")
          .not("individual_submission_id", "is", null),
        // Fetch passed reviews for team submissions (with activity scope)
        serviceClient
          .from("hackathon_submission_reviews")
          .select(`
            id, individual_submission_id, team_submission_id, review_status, score_awarded, points_possible,
            hackathon_phase_activity_team_submissions(team_id, activity_id)
          `)
          .eq("review_status", "passed")
          .not("team_submission_id", "is", null),
        // Fetch all activity scopes for scoring decisions
        serviceClient
          .from("hackathon_phase_activities")
          .select("id, submission_scope"),
      ]);

    if (
      teamsResult.error || teamSubsResult.error ||
      individualSubsResult.error || commentsResult.error || repliesResult.error ||
      individualReviewsResult.error || teamReviewsResult.error || activitiesResult.error
    ) {
      console.error("Error fetching admin team submissions:", {
        teams: teamsResult.error,
        teamSubmissions: teamSubsResult.error, individualSubmissions: individualSubsResult.error,
        comments: commentsResult.error, replies: repliesResult.error,
        individualReviews: individualReviewsResult.error, teamReviews: teamReviewsResult.error,
        activities: activitiesResult.error,
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

    // Build activity scope lookup
    const scopeByActivityId = new Map<string, string>();
    for (const act of (activitiesResult.data ?? [])) {
      scopeByActivityId.set(act.id, act.submission_scope);
    }

    // Build review lookup by team for scoring
    // individualReviews: keyed by participant_id -> activity_id -> score_awarded
    // teamReviews: keyed by team_id -> activity_id -> score_awarded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const individualReviewByPA = new Map<string, Map<string, number>>(); // participantId -> activityId -> score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const rev of (individualReviewsResult.data ?? []) as any[]) {
      const sub = rev.hackathon_phase_activity_submissions;
      if (!sub) continue;
      const pid = sub.participant_id;
      const actId = sub.activity_id;
      if (!pid || !actId) continue;
      const score = rev.score_awarded ?? 0;
      const existing = individualReviewByPA.get(pid) ?? new Map();
      const current = existing.get(actId) ?? 0;
      if (score > current) existing.set(actId, score);
      individualReviewByPA.set(pid, existing);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamReviewByTeam = new Map<string, Map<string, number>>(); // teamId -> activityId -> score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const rev of (teamReviewsResult.data ?? []) as any[]) {
      const sub = rev.hackathon_phase_activity_team_submissions;
      if (!sub) continue;
      const tid = sub.team_id;
      const actId = sub.activity_id;
      if (!tid || !actId) continue;
      const score = rev.score_awarded ?? 0;
      const existing = teamReviewByTeam.get(tid) ?? new Map();
      const current = existing.get(actId) ?? 0;
      if (score > current) existing.set(actId, score);
      teamReviewByTeam.set(tid, existing);
    }

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

    /**
     * Calculate fair score for a team:
     * - Only count PASSED reviews (filter applied at query level)
     * - Only count the BEST submission per activity (take max score_awarded)
     * - Team scope activities: score_awarded counts in full
     * - Individual scope activities: score_awarded / member_count
     * - Per-person fairness: total / member_count
     */
    function calculateFairScore(
      teamId: string,
      memberIds: string[],
      memberCount: number
    ): { rawBest: number; perPerson: number } {
      const teamReviews = teamReviewByTeam.get(teamId) ?? new Map();
      const allScores: number[] = [];

      // Add team-scoped activity scores (full points)
      for (const [actId, score] of teamReviews) {
        if (scopeByActivityId.get(actId) === "team") {
          allScores.push(score);
        }
      }

      // Add individual-scoped activity scores (divided by team member count)
      for (const pid of memberIds) {
        const indivReviews = individualReviewByPA.get(pid) ?? new Map();
        for (const [actId, score] of indivReviews) {
          if (scopeByActivityId.get(actId) === "individual") {
            // Each member's individual submission counts as: score / member_count
            // (so a 3-person team with a perfect individual activity earns same as solo with perfect)
            allScores.push(Math.floor(score / memberCount));
          }
        }
      }

      const rawBest = allScores.reduce((sum, s) => sum + s, 0);
      const perPerson = memberCount > 0 ? Math.floor(rawBest / memberCount) : 0;
      return { rawBest, perPerson };
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
      // Use fair score: best-only per activity (passed only), divide individual by member_count, then per-person
      const { rawBest, perPerson } = calculateFairScore(team.id, memberParticipantIds, memberCount);

      return {
        id: team.id, name: team.name, lobby_code: team.lobby_code, owner_id: team.owner_id,
        member_count: memberCount, members,
        total_score: rawBest, // sum of best-passed scores per activity
        score_per_member: perPerson, // fair per-person score for ranking
        team_submissions: formattedTeamSubs, individual_submissions: formattedIndividualSubs,
      };
    });

    assembled.sort((a, b) => b.score_per_member - a.score_per_member);

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
