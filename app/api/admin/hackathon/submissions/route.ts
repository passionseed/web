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
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const serviceClient = getHackathonServiceClient();

  const [individualResult, teamResult, reviewResult, teamMembersResult] = await Promise.all([
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
        created_at,
        updated_at,
        revisions,
        hackathon_participants(id, name, email, university),
        hackathon_phase_activities(
          id,
          title,
          instructions,
          submission_scope,
          hackathon_program_phases(id, title, phase_number)
        ),
        hackathon_phase_activity_assessments(id, assessment_type, points_possible, is_graded, metadata)
      `)
      .order("submitted_at", { ascending: false, nullsFirst: false }),
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
        created_at,
        updated_at,
        revisions,
        hackathon_teams(id, name, lobby_code),
        hackathon_participants(id, name, email, university),
        hackathon_phase_activities(
          id,
          title,
          instructions,
          submission_scope,
          hackathon_program_phases(id, title, phase_number)
        ),
        hackathon_phase_activity_assessments(id, assessment_type, points_possible, is_graded, metadata)
      `)
      .order("submitted_at", { ascending: false, nullsFirst: false }),
    serviceClient
      .from("hackathon_submission_reviews")
      .select("*")
      .order("reviewed_at", { ascending: false, nullsFirst: false }),
    serviceClient
      .from("hackathon_team_members")
      .select(`
        team_id,
        participant_id,
        hackathon_participants(id, name, email, university)
      `),
  ]);

  if (individualResult.error || teamResult.error || reviewResult.error || teamMembersResult.error) {
    console.error("[admin/hackathon/submissions] fetch error", {
      individual: individualResult.error,
      team: teamResult.error,
      review: reviewResult.error,
      members: teamMembersResult.error,
    });
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }

  const reviewsByIndividualId = new Map<string, any>();
  const reviewsByTeamId = new Map<string, any>();
  for (const review of reviewResult.data ?? []) {
    if (review.individual_submission_id) reviewsByIndividualId.set(review.individual_submission_id, review);
    if (review.team_submission_id) reviewsByTeamId.set(review.team_submission_id, review);
  }

  const membersByTeamId = new Map<string, any[]>();
  for (const member of teamMembersResult.data ?? []) {
    const existing = membersByTeamId.get(member.team_id) ?? [];
    existing.push({
      id: member.participant_id,
      ...(pickOne(member.hackathon_participants) ?? {}),
    });
    membersByTeamId.set(member.team_id, existing);
  }

  const individual = (individualResult.data ?? []).map((submission: any) => {
    const review = reviewsByIndividualId.get(submission.id) ?? null;
    const participant = pickOne(submission.hackathon_participants);
    const activity = pickOne(submission.hackathon_phase_activities);
    const assessment = pickOne(submission.hackathon_phase_activity_assessments);
    return {
      scope: "individual" as const,
      id: submission.id,
      status: submission.status,
      review_status: reviewStatusForFilter(submission.status, review?.review_status ?? null),
      submitted_at: submission.submitted_at,
      text_answer: submission.text_answer,
      image_url: submission.image_url,
      file_urls: submission.file_urls ?? [],
      revisions: submission.revisions ?? [],
      participant,
      team: null,
      team_members: [],
      submitted_by: participant,
      activity,
      assessment,
      review,
    };
  });

  const team = (teamResult.data ?? []).map((submission: any) => {
    const review = reviewsByTeamId.get(submission.id) ?? null;
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
      text_answer: submission.text_answer,
      image_url: submission.image_url,
      file_urls: submission.file_urls ?? [],
      revisions: submission.revisions ?? [],
      participant: null,
      team: teamRow,
      team_members: teamRow?.id ? membersByTeamId.get(teamRow.id) ?? [] : [],
      submitted_by: submittedBy,
      activity,
      assessment,
      review,
    };
  });

  let submissions = [...individual, ...team].filter((submission) => submission.status !== "draft");

  if (scope === "individual" || scope === "team") {
    submissions = submissions.filter((submission) => submission.scope === scope);
  }

  if (status) {
    submissions = submissions.filter((submission) => submission.review_status === status);
  }

  if (q) {
    submissions = submissions.filter((submission) => {
      const haystack = [
        submission.activity?.title,
        submission.participant?.name,
        submission.participant?.email,
        submission.team?.name,
        submission.team?.lobby_code,
        submission.submitted_by?.name,
        ...submission.team_members.map((member) => member.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  submissions.sort((a, b) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
    return bTime - aTime;
  });

  const counts = submissions.reduce(
    (acc, submission) => {
      acc.total += 1;
      if (
        submission.review_status === "pending_review" ||
        submission.review_status === "passed" ||
        submission.review_status === "revision_required"
      ) {
        acc[submission.review_status] += 1;
      }
      return acc;
    },
    { total: 0, pending_review: 0, passed: 0, revision_required: 0 }
  );

  return NextResponse.json({ submissions, counts });
}
