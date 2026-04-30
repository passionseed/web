import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

type HackathonServiceClient = any;

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
  const { searchParams } = new URL(req.url);
  const activityId = searchParams.get("activity_id");
  const scope = searchParams.get("scope");
  const submissionId = searchParams.get("submission_id");
  const cursorSubmittedAt = searchParams.get("cursor_submitted_at");
  const cursorId = searchParams.get("cursor_id");
  const limitRaw = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const pageSize = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 50;

  if (!activityId) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  const serviceClient = getHackathonServiceClient();

  const [admin, activityResult] = await Promise.all([
    requireAdmin(),
    serviceClient
      .from("hackathon_phase_activities")
      .select("id, submission_scope")
      .eq("id", activityId)
      .single(),
  ]);

  if (!admin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: activity, error: activityError } = activityResult;

  if (activityError || !activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  if (submissionId) {
    if (scope !== "individual" && scope !== "team") {
      return NextResponse.json({ error: "scope must be individual or team" }, { status: 400 });
    }
    return getSubmissionDetail(serviceClient, activityId, scope, submissionId);
  }

  const isTeamScope = activity.submission_scope === "team";

  if (isTeamScope) {
    return getTeamSubmissions(serviceClient, activityId, pageSize, cursorSubmittedAt, cursorId);
  } else {
    return getIndividualSubmissions(serviceClient, activityId, pageSize, cursorSubmittedAt, cursorId);
  }
}

async function getIndividualSubmissions(
  serviceClient: HackathonServiceClient,
  activityId: string,
  pageSize: number,
  cursorSubmittedAt: string | null,
  cursorId: string | null
) {
  let query = serviceClient
    .from("hackathon_phase_activity_submissions")
    .select(
      `id,participant_id,activity_id,assessment_id,image_url,revisions,status,submitted_at,updated_at,hackathon_participants(id,name,email,university,avatar_url,phone,line_id,track,grade_level),hackathon_submission_reviews(id,review_status,score_awarded,feedback,reviewed_at,reviewed_by_user_id,ai_draft,ai_draft_generated_at,ai_draft_model,ai_draft_source)`
    )
    .eq("activity_id", activityId)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (cursorSubmittedAt && cursorId) {
    query = query.or(
      `submitted_at.lt.${cursorSubmittedAt},and(submitted_at.eq.${cursorSubmittedAt},id.lt.${cursorId})`
    );
  }

  const { data: submissions, error: subError } = await query;

  if (subError) {
    console.error("[admin/activity-submissions] individual fetch error:", subError);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }

  const rows: any[] = (submissions as any[]) ?? [];
  const hasMore = rows.length > pageSize;
  const pagedRows = hasMore ? rows.slice(0, pageSize) : rows;

  const participantIds = [...new Set(pagedRows
    .map((s) => s.participant_id)
    .filter(Boolean) as string[])];

  const { data: memberships } = await serviceClient
    .from("hackathon_team_members")
    .select(`participant_id, team_id, hackathon_teams(id, name, lobby_code)`)
    .in("participant_id", participantIds.length > 0 ? participantIds : [""]);

  const participantTeamMap = new Map<string, any>();
  for (const m of (memberships as any[]) ?? []) {
    if (!participantTeamMap.has(m.participant_id)) {
      participantTeamMap.set(m.participant_id, pickOne(m.hackathon_teams));
    }
  }

  const teamIds = [...new Set(((memberships as any[]) ?? []).map((m) => m.team_id).filter(Boolean) as string[])];
  const { data: mentorAssignments } = teamIds.length > 0
    ? await serviceClient.from("mentor_team_assignments").select("team_id").in("team_id", teamIds)
    : { data: [] };
  const mentorTeamIds = new Set(((mentorAssignments ?? []) as any[]).map((r) => r.team_id));

  const formatted = pagedRows.map((s: any) => {
    const participant = pickOne(s.hackathon_participants);
    const review = pickOne(s.hackathon_submission_reviews);
    const team = participantTeamMap.get(s.participant_id) ?? null;
    return {
      scope: "individual" as const,
      id: s.id,
      status: s.status,
      review_status: normalizeSubmissionStatus(s.status, review?.review_status),
      submitted_at: s.submitted_at,
      text_answer: null,
      image_url: s.image_url,
      file_urls: [],
      revisions: Array.isArray((s as any).revisions) ? (s as any).revisions : [],
      participant,
      team,
      team_members: [],
      submitted_by: participant,
      review,
      admin_comments: [],
      has_mentor: team?.id ? mentorTeamIds.has(team.id) : false,
    };
  });

  const last = formatted[formatted.length - 1];
  return NextResponse.json({
    submissions: formatted,
    has_more: hasMore,
    next_cursor: hasMore && last?.submitted_at ? { submitted_at: last.submitted_at, id: last.id } : null,
  });
}

async function getTeamSubmissions(
  serviceClient: HackathonServiceClient,
  activityId: string,
  pageSize: number,
  cursorSubmittedAt: string | null,
  cursorId: string | null
) {
  let query = serviceClient
    .from("hackathon_phase_activity_team_submissions")
    .select(
      `id,team_id,activity_id,assessment_id,submitted_by,image_url,revisions,status,submitted_at,updated_at,hackathon_teams(id,name,lobby_code),submitter:hackathon_participants!hackathon_phase_activity_team_submissions_submitted_by_fkey(id,name,email,avatar_url),hackathon_submission_reviews(id,review_status,score_awarded,feedback,reviewed_at,reviewed_by_user_id,ai_draft,ai_draft_generated_at,ai_draft_model,ai_draft_source)`
    )
    .eq("activity_id", activityId)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (cursorSubmittedAt && cursorId) {
    query = query.or(
      `submitted_at.lt.${cursorSubmittedAt},and(submitted_at.eq.${cursorSubmittedAt},id.lt.${cursorId})`
    );
  }

  const { data: submissions, error: subError } = await query;

  if (subError) {
    console.error("[admin/activity-submissions] team fetch error:", subError);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }

  const rows: any[] = (submissions as any[]) ?? [];
  const hasMore = rows.length > pageSize;
  const pagedRows = hasMore ? rows.slice(0, pageSize) : rows;

  const teamIds = [...new Set(pagedRows
    .map((s) => pickOne(s.hackathon_teams)?.id)
    .filter(Boolean) as string[])];

  const [membersResult, mentorResult] = await Promise.all([
    teamIds.length > 0
      ? serviceClient
          .from("hackathon_team_members")
          .select(`team_id, participant_id, hackathon_participants(id, name, email, avatar_url, university)`)
          .in("team_id", teamIds)
      : { data: [] },
    teamIds.length > 0
      ? serviceClient
          .from("mentor_team_assignments")
          .select("team_id")
          .in("team_id", teamIds)
      : { data: [] },
  ]);

  const { data: members } = membersResult;
  const mentorTeamIds = new Set(((mentorResult.data ?? []) as any[]).map((r) => r.team_id));

  const membersByTeam = new Map<string, any[]>();
  for (const m of (members as any[]) ?? []) {
    const existing = membersByTeam.get(m.team_id) ?? [];
    const p = pickOne(m.hackathon_participants);
    if (p) {
      const { id: _id, ...rest } = p as any;
      existing.push({ id: m.participant_id, ...rest });
    }
    membersByTeam.set(m.team_id, existing);
  }

  const formatted = pagedRows.map((s: any) => {
    const team = pickOne(s.hackathon_teams);
    const submitter = pickOne(s.submitter);
    const review = pickOne(s.hackathon_submission_reviews);
    return {
      scope: "team" as const,
      id: s.id,
      status: s.status,
      review_status: normalizeSubmissionStatus(s.status, review?.review_status),
      submitted_at: s.submitted_at,
      text_answer: null,
      image_url: s.image_url,
      file_urls: [],
      revisions: Array.isArray((s as any).revisions) ? (s as any).revisions : [],
      participant: null,
      team,
      team_members: team?.id ? membersByTeam.get(team.id) ?? [] : [],
      submitted_by: submitter,
      review,
      admin_comments: [],
      has_mentor: team?.id ? mentorTeamIds.has(team.id) : false,
    };
  });

  const last = formatted[formatted.length - 1];
  return NextResponse.json({
    submissions: formatted,
    has_more: hasMore,
    next_cursor: hasMore && last?.submitted_at ? { submitted_at: last.submitted_at, id: last.id } : null,
  });
}

async function getSubmissionDetail(
  serviceClient: HackathonServiceClient,
  activityId: string,
  scope: "individual" | "team",
  submissionId: string
) {
  if (scope === "individual") {
    const [submissionResult, adminCommentsResult] = await Promise.all([
      serviceClient
        .from("hackathon_phase_activity_submissions")
        .select(
          `id,participant_id,activity_id,assessment_id,text_answer,image_url,file_urls,revisions,status,submitted_at,updated_at,hackathon_participants(id,name,email,university,avatar_url,phone,line_id,track,grade_level),hackathon_submission_reviews(id,review_status,score_awarded,feedback,reviewed_at,reviewed_by_user_id,ai_draft,ai_draft_generated_at,ai_draft_model,ai_draft_source)`
        )
        .eq("id", submissionId)
        .eq("activity_id", activityId)
        .maybeSingle(),
      serviceClient
        .from("hackathon_submission_admin_comments")
        .select("*")
        .eq("individual_submission_id", submissionId)
        .order("created_at", { ascending: true }),
    ]);

    const { data: submission, error: subError } = submissionResult;
    const { data: adminComments } = adminCommentsResult;

    if (subError) {
      console.error("[admin/activity-submissions] individual detail fetch error:", subError);
      return NextResponse.json({ error: "Failed to fetch submission detail" }, { status: 500 });
    }
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    let team = null;
    if (submission.participant_id) {
      const { data: memberships } = await serviceClient
        .from("hackathon_team_members")
        .select(`participant_id, team_id, hackathon_teams(id, name, lobby_code)`)
        .eq("participant_id", submission.participant_id)
        .limit(1);
      team = memberships && memberships.length > 0 ? pickOne((memberships as any[])[0].hackathon_teams) : null;
    }

    const participant = pickOne(submission.hackathon_participants);
    const review = pickOne(submission.hackathon_submission_reviews);

    return NextResponse.json({
      submission: {
        scope: "individual" as const,
        id: submission.id,
        status: submission.status,
        review_status: normalizeSubmissionStatus(submission.status, review?.review_status),
        submitted_at: submission.submitted_at,
        text_answer: submission.text_answer,
        image_url: submission.image_url,
        file_urls: submission.file_urls ?? [],
        revisions: Array.isArray((submission as any).revisions) ? (submission as any).revisions : [],
        participant,
        team,
        team_members: [],
        submitted_by: participant,
        review,
        admin_comments: adminComments ?? [],
      },
    });
  }

  const [submissionResult, adminCommentsResult] = await Promise.all([
    serviceClient
      .from("hackathon_phase_activity_team_submissions")
      .select(
        `id,team_id,activity_id,assessment_id,submitted_by,text_answer,image_url,file_urls,revisions,status,submitted_at,updated_at,hackathon_teams(id,name,lobby_code),submitter:hackathon_participants!hackathon_phase_activity_team_submissions_submitted_by_fkey(id,name,email,avatar_url),hackathon_submission_reviews(id,review_status,score_awarded,feedback,reviewed_at,reviewed_by_user_id,ai_draft,ai_draft_generated_at,ai_draft_model,ai_draft_source)`
      )
      .eq("id", submissionId)
      .eq("activity_id", activityId)
      .maybeSingle(),
    serviceClient
      .from("hackathon_submission_admin_comments")
      .select("*")
      .eq("team_submission_id", submissionId)
      .order("created_at", { ascending: true }),
  ]);

  const { data: submission, error: subError } = submissionResult;
  const { data: adminComments } = adminCommentsResult;

  if (subError) {
    console.error("[admin/activity-submissions] team detail fetch error:", subError);
    return NextResponse.json({ error: "Failed to fetch submission detail" }, { status: 500 });
  }
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const team = pickOne(submission.hackathon_teams);

  // Fetch all sibling submissions (same team + activity, different assessment)
  // and the assessment metadata for labels
  const [siblingsResult, assessmentsResult, membersResult] = await Promise.all([
    serviceClient
      .from("hackathon_phase_activity_team_submissions")
      .select("id,assessment_id,text_answer,image_url,file_urls")
      .eq("team_id", submission.team_id)
      .eq("activity_id", activityId)
      .order("id"),
    serviceClient
      .from("hackathon_phase_activity_assessments")
      .select("id,display_order,metadata")
      .eq("activity_id", activityId)
      .order("display_order"),
    team?.id
      ? serviceClient
          .from("hackathon_team_members")
          .select(`team_id, participant_id, hackathon_participants(id, name, email, avatar_url, university)`)
          .eq("team_id", team.id)
      : Promise.resolve({ data: [] }),
  ]);

  const siblings: any[] = siblingsResult.data ?? [];
  const assessments: any[] = assessmentsResult.data ?? [];

  // Build answers array ordered by assessment display_order
  const assessmentMap = new Map(assessments.map((a) => [a.id, a]));
  const answers = siblings
    .map((s) => {
      const assessment = assessmentMap.get(s.assessment_id);
      const meta = assessment?.metadata ?? {};
      const label =
        meta.label ?? meta.title ?? meta.prompt ?? meta.submission_label ?? null;
      return {
        submission_id: s.id,
        assessment_id: s.assessment_id,
        display_order: assessment?.display_order ?? 0,
        label,
        text_answer: s.text_answer,
        image_url: s.image_url,
        file_urls: s.file_urls ?? [],
      };
    })
    .sort((a, b) => a.display_order - b.display_order);

  let teamMembers: any[] = [];
  for (const m of (membersResult.data as any[]) ?? []) {
    const p = pickOne(m.hackathon_participants);
    if (!p) continue;
    const { id: _id, ...rest } = p as any;
    teamMembers.push({ id: m.participant_id, ...rest });
  }

  const submitter = pickOne(submission.submitter);
  const review = pickOne(submission.hackathon_submission_reviews);
  return NextResponse.json({
    submission: {
      scope: "team" as const,
      id: submission.id,
      status: submission.status,
      review_status: normalizeSubmissionStatus(submission.status, review?.review_status),
      submitted_at: submission.submitted_at,
      text_answer: submission.text_answer,
      image_url: submission.image_url,
      file_urls: submission.file_urls ?? [],
      revisions: Array.isArray((submission as any).revisions) ? (submission as any).revisions : [],
      participant: null,
      team,
      team_members: teamMembers,
      submitted_by: submitter,
      review,
      admin_comments: adminComments ?? [],
      answers: answers.length > 1 ? answers : undefined,
    },
  });
}
