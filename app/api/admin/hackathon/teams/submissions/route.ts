import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
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
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const sc = getServiceClient();

    // Step 1: Get team IDs that have submissions + their scores, sorted by score desc
    // This is the key optimization — we only fetch IDs first, then hydrate the page
    const [teamSubIds, indivSubTeamIds, scoresResult] = await Promise.all([
      sc.from("hackathon_phase_activity_team_submissions")
        .select("team_id")
        .then(r => new Set((r.data ?? []).map((d: { team_id: string }) => d.team_id))),
      sc.from("hackathon_phase_activity_submissions")
        .select("participant_id")
        .then(async r => {
          const pids = [...new Set((r.data ?? []).map((d: { participant_id: string }) => d.participant_id))];
          if (pids.length === 0) return new Set<string>();
          const { data: members } = await sc
            .from("hackathon_team_members")
            .select("team_id, participant_id")
            .in("participant_id", pids);
          return new Set((members ?? []).map((m: { team_id: string }) => m.team_id));
        }),
      sc.from("hackathon_team_scores").select("team_id, total_score"),
    ]);

    // Merge team IDs that have any submissions
    const teamsWithSubIds = new Set([...teamSubIds, ...indivSubTeamIds]);

    // Build score map and sort
    const scoreMap = new Map<string, number>(
      (scoresResult.data ?? []).map((s: { team_id: string; total_score: number }) => [s.team_id, s.total_score])
    );

    const sortedTeamIds = [...teamsWithSubIds]
      .filter(id => {
        // We need team names to filter test teams — but we don't have them yet.
        // We'll filter after fetching team data for the broader set.
        return true;
      })
      .sort((a, b) => (scoreMap.get(b) ?? 0) - (scoreMap.get(a) ?? 0));

    // Step 2: Fetch team basic info for sorted IDs to filter test teams
    const { data: allTeamInfo } = await sc
      .from("hackathon_teams")
      .select("id, name")
      .in("id", sortedTeamIds);

    const testTeamIds = new Set(
      (allTeamInfo ?? [])
        .filter((t: { name: string }) => TEST_TEAM_NAMES.includes(t.name))
        .map((t: { id: string }) => t.id)
    );

    const filteredIds = sortedTeamIds.filter(id => !testTeamIds.has(id));
    const totalItems = filteredIds.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageIds = filteredIds.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    if (pageIds.length === 0) {
      return NextResponse.json({
        teams: [],
        activity_comments_by_id: {},
        pagination: { page: safePage, page_size: PAGE_SIZE, total_items: totalItems, total_pages: totalPages },
      });
    }

    // Step 3: Hydrate only the page's teams — parallel fetches scoped to pageIds
    const [teamsResult, teamSubsResult, membersResult] = await Promise.all([
      sc.from("hackathon_teams")
        .select("id, name, lobby_code, owner_id")
        .in("id", pageIds),
      sc.from("hackathon_phase_activity_team_submissions")
        .select(`
          id, team_id, activity_id, assessment_id, status, text_answer, image_url, file_urls, submitted_at, submitted_by,
          hackathon_participants!submitted_by(name),
          hackathon_phase_activity_assessments!assessment_id(id, metadata, display_order,
            hackathon_phase_activities(title, display_order, phase_id, hackathon_program_phases(id, title, phase_number)))
        `)
        .in("team_id", pageIds),
      sc.from("hackathon_team_members")
        .select("team_id, participant_id, hackathon_participants(id, name, email, university)")
        .in("team_id", pageIds),
    ]);

    // Get participant IDs for individual submissions
    const membersByTeam = new Map<string, { participant_id: string; name: string; email: string; university: string; is_owner: boolean }[]>();
    const allParticipantIds: string[] = [];
    const teamOwnerMap = new Map<string, string>();
    for (const t of teamsResult.data ?? []) {
      teamOwnerMap.set(t.id, t.owner_id);
    }
    for (const m of membersResult.data ?? []) {
      const p = m.hackathon_participants as unknown as { id: string; name: string; email: string; university: string } | null;
      if (!p) continue;
      allParticipantIds.push(m.participant_id);
      const arr = membersByTeam.get(m.team_id) ?? [];
      arr.push({
        participant_id: m.participant_id,
        name: p.name, email: p.email, university: p.university,
        is_owner: m.participant_id === teamOwnerMap.get(m.team_id),
      });
      membersByTeam.set(m.team_id, arr);
    }

    // Fetch individual submissions only for participants in page teams
    const indivSubsResult = allParticipantIds.length > 0
      ? await sc.from("hackathon_phase_activity_submissions")
          .select(`
            id, participant_id, activity_id, assessment_id, status, text_answer, image_url, file_urls, submitted_at,
            hackathon_participants!participant_id(name),
            hackathon_phase_activity_assessments!assessment_id(id, metadata, display_order,
              hackathon_phase_activities(title, display_order, phase_id, hackathon_program_phases(id, title, phase_number)))
          `)
          .in("participant_id", allParticipantIds)
      : { data: [] };

    // Collect activity IDs for comments
    const activityIds = new Set<string>();
    for (const s of teamSubsResult.data ?? []) activityIds.add(s.activity_id);
    for (const s of indivSubsResult.data ?? []) activityIds.add(s.activity_id);

    // Fetch comments only for relevant activities
    const activityIdArr = [...activityIds];
    const [commentsResult, repliesResult] = activityIdArr.length > 0
      ? await Promise.all([
          sc.from("hackathon_activity_comments")
            .select("id, activity_id, participant_id, content, engagement_score, created_at, updated_at, is_edited, hackathon_participants(name, display_name, avatar_url)")
            .is("deleted_at", null)
            .in("activity_id", activityIdArr)
            .order("created_at", { ascending: true }),
          sc.from("hackathon_activity_comment_replies")
            .select("id, comment_id, participant_id, content, created_at, updated_at, is_edited, hackathon_participants(name, display_name, avatar_url)")
            .is("deleted_at", null)
            .order("created_at", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];

    const commentsByActivityId = buildActivityCommentsByActivity(
      commentsResult.data ?? [],
      repliesResult.data ?? []
    );

    // Step 4: Assemble response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function formatAssessment(s: any) {
      const assessment = s.hackathon_phase_activity_assessments as unknown as {
        id: string; metadata: Record<string, string> | null; display_order: number;
        hackathon_phase_activities?: {
          title: string; display_order: number; phase_id: string;
          hackathon_program_phases?: { id: string; title: string; phase_number: number } | null;
        } | null;
      } | null;
      const activity = assessment?.hackathon_phase_activities ?? null;
      const prompt = assessment?.metadata?.prompt ?? assessment?.metadata?.submission_label ?? null;
      return { assessment, activity, prompt };
    }

    const teamSubsByTeamId = new Map<string, typeof teamSubsResult.data>();
    for (const sub of teamSubsResult.data ?? []) {
      const arr = teamSubsByTeamId.get(sub.team_id) ?? [];
      arr.push(sub);
      teamSubsByTeamId.set(sub.team_id, arr);
    }

    const indivSubsByPid = new Map<string, typeof indivSubsResult.data>();
    for (const sub of indivSubsResult.data ?? []) {
      const arr = indivSubsByPid.get(sub.participant_id) ?? [];
      arr.push(sub);
      indivSubsByPid.set(sub.participant_id, arr);
    }

    const assembled = pageIds.map(teamId => {
      const team = (teamsResult.data ?? []).find(t => t.id === teamId);
      if (!team) return null;

      const members = membersByTeam.get(teamId) ?? [];
      const rawTeamSubs = teamSubsByTeamId.get(teamId) ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedTeamSubs = rawTeamSubs.map((s: any) => {
        const { assessment, activity, prompt } = formatAssessment(s);
        return {
          id: s.id, activity_id: s.activity_id, assessment_id: assessment?.id ?? null, prompt,
          activity_title: activity?.title ?? null,
          activity_display_order: activity?.display_order ?? null,
          phase_id: activity?.phase_id ?? null,
          phase_title: activity?.hackathon_program_phases?.title ?? null,
          phase_number: activity?.hackathon_program_phases?.phase_number ?? null,
          status: s.status, text_answer: s.text_answer ?? null, image_url: s.image_url ?? null, file_urls: s.file_urls ?? [],
          submitted_at: s.submitted_at ?? null,
          submitted_by_name: (s.hackathon_participants as unknown as { name: string } | null)?.name ?? null,
        };
      });

      const memberPids = members.map(m => m.participant_id);
      const formattedIndividualSubs = memberPids.flatMap(pid => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (indivSubsByPid.get(pid) ?? []).map((s: any) => {
          const { assessment, activity, prompt } = formatAssessment(s);
          return {
            id: s.id, participant_id: pid, activity_id: s.activity_id, assessment_id: assessment?.id ?? null, prompt,
            activity_title: activity?.title ?? null,
            activity_display_order: activity?.display_order ?? null,
            phase_id: activity?.phase_id ?? null,
            phase_title: activity?.hackathon_program_phases?.title ?? null,
            phase_number: activity?.hackathon_program_phases?.phase_number ?? null,
            participant_name: (s.hackathon_participants as unknown as { name: string } | null)?.name ?? null,
            status: s.status, text_answer: s.text_answer ?? null, image_url: s.image_url ?? null, file_urls: s.file_urls ?? [],
            submitted_at: s.submitted_at ?? null,
          };
        });
      });

      return {
        id: team.id, name: team.name, lobby_code: team.lobby_code, owner_id: team.owner_id,
        member_count: members.length, members,
        total_score: scoreMap.get(teamId) ?? 0,
        team_submissions: formattedTeamSubs,
        individual_submissions: formattedIndividualSubs,
      };
    }).filter(Boolean);

    // Filter comments to only activities in this page
    const pageActivityIds = new Set<string>();
    for (const t of assembled) {
      if (!t) continue;
      for (const s of t.team_submissions) pageActivityIds.add(s.activity_id);
      for (const s of t.individual_submissions) pageActivityIds.add(s.activity_id);
    }
    const filteredComments: Record<string, unknown> = {};
    for (const actId of pageActivityIds) {
      if (commentsByActivityId[actId]) filteredComments[actId] = commentsByActivityId[actId];
    }

    return NextResponse.json({
      teams: assembled,
      activity_comments_by_id: filteredComments,
      pagination: { page: safePage, page_size: PAGE_SIZE, total_items: totalItems, total_pages: totalPages },
    });
  } catch (err) {
    return safeServerError("Failed to fetch team submissions", err);
  }
}
