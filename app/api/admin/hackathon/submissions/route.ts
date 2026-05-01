import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const PAGE_SIZE = 50;

function getHackathonServiceClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin() {
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

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function reviewStatusForFilter(submissionStatus: string, reviewStatus: string | null) {
  if (reviewStatus) return reviewStatus;
  if (submissionStatus === "submitted" || submissionStatus === "pending_review") return "pending_review";
  return submissionStatus;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const scope = searchParams.get("scope");
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const serviceClient = getHackathonServiceClient();

  // Determine which tables to query based on scope
  const queryIndividual = !scope || scope === "individual";
  const queryTeam = !scope || scope === "team";

  // Build base select for individual submissions (includes review via JOIN)
  const individualSelect = `
    id, participant_id, activity_id, assessment_id, image_url, status, submitted_at, created_at, updated_at, revisions,
    hackathon_participants(id, name, email, university),
    hackathon_phase_activities(id, title, submission_scope, hackathon_program_phases(id, title, phase_number)),
    hackathon_phase_activity_assessments(id, assessment_type, points_possible, is_graded, metadata),
    hackathon_submission_reviews(id, review_status, score_awarded, points_possible, feedback, reviewed_at)
  `;

  // Build base select for team submissions
  const teamSelect = `
    id, team_id, activity_id, assessment_id, submitted_by, image_url, status, submitted_at, created_at, updated_at, revisions,
    hackathon_teams(id, name, lobby_code),
    hackathon_participants(id, name, email, university),
    hackathon_phase_activities(id, title, submission_scope, hackathon_program_phases(id, title, phase_number)),
    hackathon_phase_activity_assessments(id, assessment_type, points_possible, is_graded, metadata),
    hackathon_submission_reviews(id, review_status, score_awarded, points_possible, feedback, reviewed_at)
  `;

  // Build individual query
  function buildIndividualQuery() {
    let dbQuery = serviceClient
      .from("hackathon_phase_activity_submissions")
      .select(individualSelect, { count: "exact" })
      .neq("status", "draft")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (q) {
      dbQuery = dbQuery.or(
        `hackathon_participants.name.ilike.%${q}%,hackathon_participants.email.ilike.%${q}%,hackathon_phase_activities.title.ilike.%${q}%`
      );
    }

    return dbQuery;
  }

  // Build team query
  function buildTeamQuery() {
    return serviceClient
      .from("hackathon_phase_activity_team_submissions")
      .select(teamSelect, { count: "exact" })
      .neq("status", "draft")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + PAGE_SIZE - 1);
  }

  // Execute queries in parallel
  const [individualResult, teamResult] = await Promise.all([
    queryIndividual ? buildIndividualQuery() : Promise.resolve({ data: [], count: 0, error: null }),
    queryTeam ? buildTeamQuery() : Promise.resolve({ data: [], count: 0, error: null }),
  ]);

  if (individualResult.error || teamResult.error) {
    console.error("[admin/hackathon/submissions] fetch error", {
      individual: individualResult.error,
      team: teamResult.error,
    });
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }

  // Get team members for team submissions
  const teamIds = (teamResult.data ?? [])
    .map((s: any) => s.team_id)
    .filter((id: any): id is string => Boolean(id));

  const membersResult = teamIds.length > 0
    ? await serviceClient
        .from("hackathon_team_members")
        .select("team_id, participant_id, hackathon_participants(id, name, email, university)")
        .in("team_id", teamIds)
    : { data: [] };

  const membersByTeamId = new Map<string, any[]>();
  for (const member of membersResult.data ?? []) {
    const existing = membersByTeamId.get(member.team_id) ?? [];
    existing.push({
      id: member.participant_id,
      ...(pickOne(member.hackathon_participants) ?? {}),
    });
    membersByTeamId.set(member.team_id, existing);
  }

  // Format individual submissions
  const individual = (individualResult.data ?? []).map((submission: any) => {
    const review = submission.hackathon_submission_reviews?.[0] ?? null;
    const participant = pickOne(submission.hackathon_participants);
    const activity = pickOne(submission.hackathon_phase_activities);
    const assessment = pickOne(submission.hackathon_phase_activity_assessments);
    return {
      scope: "individual" as const,
      id: submission.id,
      status: submission.status,
      review_status: reviewStatusForFilter(submission.status, review?.review_status ?? null),
      submitted_at: submission.submitted_at,
      image_url: submission.image_url,
      revisions: submission.revisions ?? [],
      participant,
      team: null,
      team_members: [],
      submitted_by: participant,
      activity,
      assessment,
      review: review ? {
        id: review.id,
        review_status: review.review_status,
        score_awarded: review.score_awarded,
        points_possible: review.points_possible,
        feedback: review.feedback,
        reviewed_at: review.reviewed_at,
      } : null,
    };
  });

  // Format team submissions
  const team = (teamResult.data ?? []).map((submission: any) => {
    const review = submission.hackathon_submission_reviews?.[0] ?? null;
    const teamRow = pickOne(submission.hackathon_teams);
    const activity = pickOne(submission.hackathon_phase_activities);
    const assessment = pickOne(submission.hackathon_phase_activity_assessments);
    const submittedBy = pickOne(submission.hackathon_participants);
    return {
      scope: "team" as const,
      id: submission.id,
      status: submission.status,
      review_status: reviewStatusForFilter(submission.status, review?.review_status ?? null),
      submitted_at: submission.submitted_at,
      image_url: submission.image_url,
      revisions: submission.revisions ?? [],
      participant: null,
      team: teamRow,
      team_members: teamRow?.id ? membersByTeamId.get(teamRow.id) ?? [] : [],
      submitted_by: submittedBy,
      activity,
      assessment,
      review: review ? {
        id: review.id,
        review_status: review.review_status,
        score_awarded: review.score_awarded,
        points_possible: review.points_possible,
        feedback: review.feedback,
        reviewed_at: review.reviewed_at,
      } : null,
    };
  });

  // Combine and sort
  let submissions = [...individual, ...team];
  submissions.sort((a, b) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return bTime - aTime;
  });

  // Apply status filter (post-DB since review is embedded now)
  if (status === "improvements") {
    submissions = submissions.filter(
      (s) => s.revisions?.length > 0 && s.review_status === "pending_review"
    );
  } else if (status) {
    submissions = submissions.filter((s) => s.review_status === status);
  }

  // Apply search filter for team-specific fields (lobby_code, team name, team members)
  if (q && queryTeam) {
    const qLower = q.toLowerCase();
    submissions = submissions.filter((submission) => {
      if (submission.scope === "individual") return true;
      const haystack = [
        submission.team?.name,
        submission.team?.lobby_code,
        ...(submission.team_members?.map((m: any) => m.name) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(qLower);
    });
  }

  const totalItems = (individualResult.count ?? 0) + (teamResult.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  return NextResponse.json({
    submissions,
    counts: { total: totalItems, pending_review: 0, passed: 0, revision_required: 0 },
    pagination: {
      page,
      page_size: PAGE_SIZE,
      total_items: totalItems,
      total_pages: totalPages,
    },
  });
}
