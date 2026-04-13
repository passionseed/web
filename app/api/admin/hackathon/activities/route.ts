import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

function normalizeSubmissionStatus(subStatus: string, reviewStatus: string | null | undefined): string {
  if (reviewStatus) return reviewStatus;
  if (subStatus === "submitted" || subStatus === "pending_review") return "pending_review";
  return subStatus;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const programId = searchParams.get("program_id");

  const serviceClient = getHackathonServiceClient();

  const phasesQuery = serviceClient
    .from("hackathon_program_phases")
    .select(`
      id,
      program_id,
      slug,
      title,
      description,
      phase_number,
      starts_at,
      ends_at,
      due_at,
      created_at,
      updated_at,
      hackathon_phase_activities!hackathon_phase_activities_phase_id_fkey(
        id,
        phase_id,
        title,
        instructions,
        display_order,
        estimated_minutes,
        is_required,
        is_draft,
        submission_scope,
        created_at,
        updated_at,
        hackathon_phase_activity_content(
          id,
          content_type,
          content_title,
          display_order
        ),
        hackathon_phase_activity_assessments(
          id,
          assessment_type,
          points_possible,
          is_graded,
          display_order,
          metadata
        )
      )
    `)
    .order("phase_number", { ascending: true });

  if (programId) {
    phasesQuery.eq("program_id", programId);
  }

  const { data: phases, error: phasesError } = await phasesQuery;

  if (phasesError) {
    console.error("[admin/hackathon/activities] phases fetch error:", phasesError);
    return NextResponse.json(
      { error: "Failed to fetch phases" },
      { status: 500 }
    );
  }

  const activityIds: string[] = [];
  for (const phase of phases ?? []) {
    const activities = Array.isArray(phase.hackathon_phase_activities)
      ? phase.hackathon_phase_activities
      : [];
    for (const activity of activities) {
      activityIds.push(activity.id);
    }
  }

  const activityIdFilter = activityIds.length > 0 ? activityIds : [""];

  const [individualResult, teamResult] = await Promise.all([
    serviceClient
      .from("hackathon_phase_activity_submissions")
      .select(`
        id,
        participant_id,
        activity_id,
        assessment_id,
        text_answer,
        image_url,
        file_urls,
        status,
        submitted_at,
        updated_at,
        hackathon_participants(id, name, email, university, avatar_url),
        hackathon_submission_reviews(
          id,
          review_status,
          score_awarded,
          feedback,
          reviewed_at,
          reviewer_id
        )
      `)
      .in("activity_id", activityIdFilter)
      .order("submitted_at", { ascending: false }),
    serviceClient
      .from("hackathon_phase_activity_team_submissions")
      .select(`
        id,
        team_id,
        activity_id,
        assessment_id,
        submitted_by,
        text_answer,
        image_url,
        file_urls,
        status,
        submitted_at,
        updated_at,
        hackathon_teams(id, name, lobby_code),
        submitter:hackathon_participants!hackathon_phase_activity_team_submissions_submitted_by_fkey(id, name, email, avatar_url),
        hackathon_submission_reviews(
          id,
          review_status,
          score_awarded,
          feedback,
          reviewed_at,
          reviewer_id
        )
      `)
      .in("activity_id", activityIdFilter)
      .order("submitted_at", { ascending: false }),
  ]);

  if (individualResult.error || teamResult.error) {
    console.error("[admin/hackathon/activities] submission fetch errors:", {
      individual: individualResult.error,
      team: teamResult.error,
    });
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }

  const teamIds = (teamResult.data ?? [])
    .map((sub) => pickOne(sub.hackathon_teams)?.id)
    .filter(Boolean) as string[];

  const { data: teamMembers, error: membersError } = await serviceClient
    .from("hackathon_team_members")
    .select(`
      team_id,
      participant_id,
      hackathon_participants(id, name, email, avatar_url)
    `)
    .in("team_id", teamIds.length > 0 ? teamIds : [""]);

  if (membersError) {
    console.error("[admin/hackathon/activities] team members error:", membersError);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }

  const [adminCommentsResult] = await Promise.all([
    serviceClient
      .from("hackathon_submission_admin_comments")
      .select("*")
      .in("individual_submission_id", (individualResult.data ?? []).map((s) => s.id).length > 0
        ? (individualResult.data ?? []).map((s) => s.id)
        : [""])
      .or(
        `team_submission_id.in.(${(teamResult.data ?? []).map((s) => s.id).join(",") || ""})`
      )
      .order("created_at", { ascending: true }),
  ]);

  if (adminCommentsResult.error) {
    console.error("[admin/hackathon/activities] admin comments error:", adminCommentsResult.error);
  }

  const commentsByIndividualId = new Map<string, any[]>();
  const commentsByTeamId = new Map<string, any[]>();
  for (const comment of adminCommentsResult.data ?? []) {
    if (comment.individual_submission_id) {
      const existing = commentsByIndividualId.get(comment.individual_submission_id) ?? [];
      existing.push(comment);
      commentsByIndividualId.set(comment.individual_submission_id, existing);
    }
    if (comment.team_submission_id) {
      const existing = commentsByTeamId.get(comment.team_submission_id) ?? [];
      existing.push(comment);
      commentsByTeamId.set(comment.team_submission_id, existing);
    }
  }

  const membersByTeamId = new Map<string, any[]>();
  for (const member of teamMembers ?? []) {
    const existing = membersByTeamId.get(member.team_id) ?? [];
    const participant = pickOne(member.hackathon_participants);
    if (participant) {
      const { id: _id, ...participantWithoutId } = participant as { id?: string; name?: string | null; email?: string | null; avatar_url?: string | null };
      existing.push({
        id: member.participant_id,
        ...participantWithoutId,
      });
    }
    membersByTeamId.set(member.team_id, existing);
  }

  const submissionsByActivity = new Map<string, any[]>();

  for (const sub of individualResult.data ?? []) {
    if (sub.status === "draft") continue;

    const participant = pickOne(sub.hackathon_participants);
    const review = pickOne(sub.hackathon_submission_reviews);

    const formatted = {
      scope: "individual" as const,
      id: sub.id,
      status: sub.status,
      review_status: normalizeSubmissionStatus(sub.status, review?.review_status),
      submitted_at: sub.submitted_at,
      text_answer: sub.text_answer,
      image_url: sub.image_url,
      file_urls: sub.file_urls ?? [],
      participant,
      team: null,
      team_members: [],
      submitted_by: participant,
      review,
      admin_comments: commentsByIndividualId.get(sub.id) ?? [],
    };

    const existing = submissionsByActivity.get(sub.activity_id) ?? [];
    existing.push(formatted);
    submissionsByActivity.set(sub.activity_id, existing);
  }

  for (const sub of teamResult.data ?? []) {
    if (sub.status === "draft") continue;

    const team = pickOne(sub.hackathon_teams);
    const submitter = pickOne(sub.submitter);
    const review = pickOne(sub.hackathon_submission_reviews);

    const formatted = {
      scope: "team" as const,
      id: sub.id,
      status: sub.status,
      review_status: normalizeSubmissionStatus(sub.status, review?.review_status),
      submitted_at: sub.submitted_at,
      text_answer: sub.text_answer,
      image_url: sub.image_url,
      file_urls: sub.file_urls ?? [],
      participant: null,
      team,
      team_members: team?.id ? membersByTeamId.get(team.id) ?? [] : [],
      submitted_by: submitter,
      review,
      admin_comments: commentsByTeamId.get(sub.id) ?? [],
    };

    const existing = submissionsByActivity.get(sub.activity_id) ?? [];
    existing.push(formatted);
    submissionsByActivity.set(sub.activity_id, existing);
  }

  const formattedPhases = (phases ?? []).map((phase) => {
    const activities = Array.isArray(phase.hackathon_phase_activities)
      ? phase.hackathon_phase_activities
      : [];

    return {
      ...phase,
      hackathon_phase_activities: activities
        .sort((a, b) => a.display_order - b.display_order)
        .map((activity) => ({
          ...activity,
          content: Array.isArray(activity.hackathon_phase_activity_content)
            ? activity.hackathon_phase_activity_content.sort(
                (a, b) => a.display_order - b.display_order
              )
            : [],
          assessments: Array.isArray(activity.hackathon_phase_activity_assessments)
            ? activity.hackathon_phase_activity_assessments.sort(
                (a, b) => a.display_order - b.display_order
              )
            : [],
          submissions: submissionsByActivity.get(activity.id) ?? [],
          submission_count: (submissionsByActivity.get(activity.id) ?? []).length,
        })),
    };
  });

  let totalSubmissions = 0;
  let pendingReview = 0;
  let passed = 0;
  let needsRevision = 0;

  for (const submissions of submissionsByActivity.values()) {
    for (const sub of submissions) {
      totalSubmissions++;
      if (sub.review_status === "pending_review") pendingReview++;
      if (sub.review_status === "passed") passed++;
      if (sub.review_status === "revision_required") needsRevision++;
    }
  }

  return NextResponse.json({
    phases: formattedPhases,
    stats: {
      total_submissions: totalSubmissions,
      pending_review: pendingReview,
      passed: passed,
      revision_required: needsRevision,
    },
  });
}
