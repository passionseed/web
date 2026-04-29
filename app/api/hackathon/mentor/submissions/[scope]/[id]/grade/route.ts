import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMentorBySessionToken, MENTOR_SESSION_COOKIE } from "@/lib/hackathon/mentor-db";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  buildReviewInboxItems,
  normalizeScoreAwarded,
  reviewStatusToSubmissionStatus,
  type HackathonReviewStatus,
  type HackathonSubmissionScope,
} from "@/lib/hackathon/admin-submissions";
import { recalculateAndUpsertTeamScore } from "@/lib/hackathon/team-score";

const reviewSchema = z.object({
  review_status: z.enum(["passed", "revision_required"]),
  feedback: z.string().max(5000).optional(),
});

function getClient() {
  return createServiceClient(
    process.env.HACKATHON_SUPABASE_URL!,
    process.env.HACKATHON_SUPABASE_SERVICE_ROLE_KEY!
  );
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function getMentorTeamId(db: ReturnType<typeof getClient>, mentorId: string, teamId: string): Promise<boolean> {
  const { data } = await db
    .from("mentor_team_assignments")
    .select("id")
    .eq("mentor_id", mentorId)
    .eq("team_id", teamId)
    .maybeSingle();
  return !!data;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const token = req.cookies.get(MENTOR_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mentor = await getMentorBySessionToken(token);
  if (!mentor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scope: rawScope, id } = await params;
  if (rawScope !== "individual" && rawScope !== "team") {
    return NextResponse.json({ error: "Invalid submission scope" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
  }

  const scope = rawScope as HackathonSubmissionScope;
  const db = getClient();
  const table =
    scope === "individual"
      ? "hackathon_phase_activity_submissions"
      : "hackathon_phase_activity_team_submissions";

  const baseColumns = scope === "individual" ? "id, participant_id, status" : "id, team_id, status";

  const { data: submission, error: submissionError } = await db
    .from(table)
    .select(`${baseColumns}, hackathon_phase_activities(id, title), hackathon_phase_activity_assessments(id, points_possible)`)
    .eq("id", id)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Determine team and verify mentor is assigned to it
  let teamId: string | null = null;
  if (scope === "team") {
    teamId = (submission as any).team_id ?? null;
  } else {
    const { data: mem } = await db
      .from("hackathon_team_members")
      .select("team_id")
      .eq("participant_id", (submission as any).participant_id)
      .maybeSingle();
    teamId = (mem as any)?.team_id ?? null;
  }

  if (!teamId) {
    return NextResponse.json({ error: "Could not determine team for this submission" }, { status: 400 });
  }

  const isAssigned = await getMentorTeamId(db, mentor.id, teamId);
  if (!isAssigned) {
    return NextResponse.json({ error: "You are not assigned to this team" }, { status: 403 });
  }

  const activity = pickOne((submission as any).hackathon_phase_activities);
  const assessment = pickOne((submission as any).hackathon_phase_activity_assessments);
  const pointsPossible = typeof assessment?.points_possible === "number" ? assessment.points_possible : null;
  const scoreAwarded = normalizeScoreAwarded(null, pointsPossible);
  const feedback = parsed.data.feedback?.trim() ?? "";
  const reviewStatus = parsed.data.review_status as HackathonReviewStatus;
  const now = new Date().toISOString();

  const reviewKey =
    scope === "individual"
      ? { column: "individual_submission_id", value: id }
      : { column: "team_submission_id", value: id };

  const reviewTarget =
    scope === "individual"
      ? { individual_submission_id: id, team_submission_id: null }
      : { individual_submission_id: null, team_submission_id: id };

  // Get recipient participant IDs
  let recipientParticipantIds: string[] = [];
  if (scope === "individual") {
    const pid = (submission as any).participant_id;
    if (pid) recipientParticipantIds = [pid];
  } else {
    const { data: members } = await db
      .from("hackathon_team_members")
      .select("participant_id")
      .eq("team_id", teamId);
    recipientParticipantIds = ((members ?? []) as Array<{ participant_id: string }>)
      .map((m) => m.participant_id)
      .filter(Boolean);
  }

  if (recipientParticipantIds.length === 0) {
    return NextResponse.json({ error: "No participants found for submission" }, { status: 400 });
  }

  const [existingReviewResult] = await Promise.all([
    db.from("hackathon_submission_reviews")
      .select("id")
      .eq(reviewKey.column, reviewKey.value)
      .maybeSingle(),
  ]);

  const existingReview = existingReviewResult.data;

  const reviewPayload = {
    submission_scope: scope,
    ...reviewTarget,
    review_status: reviewStatus,
    score_awarded: scoreAwarded,
    points_possible: pointsPossible,
    feedback,
    reviewed_by_user_id: null,
    reviewed_at: now,
    ai_draft: null,
    ai_draft_generated_at: null,
    ai_draft_model: null,
    ai_draft_source: null,
  };

  const reviewResult = existingReview
    ? await db.from("hackathon_submission_reviews").update(reviewPayload).eq("id", existingReview.id).select("*").single()
    : await db.from("hackathon_submission_reviews").insert(reviewPayload).select("*").single();

  if (reviewResult.error) {
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }

  const inboxItems = buildReviewInboxItems({
    submissionScope: scope,
    recipientParticipantIds,
    activityTitle: activity?.title ?? "Hackathon submission",
    reviewStatus,
    scoreAwarded,
    pointsPossible,
    feedback,
    submissionId: id,
  });

  const [submissionUpdateResult, inboxResult] = await Promise.all([
    db.from(table).update({ status: reviewStatusToSubmissionStatus(reviewStatus), updated_at: now }).eq("id", id),
    db.from("hackathon_participant_inbox_items").insert(inboxItems),
  ]);

  if (submissionUpdateResult.error) {
    return NextResponse.json({ error: "Review saved, but submission status update failed" }, { status: 500 });
  }
  if (inboxResult.error) {
    return NextResponse.json({ error: "Review saved, but inbox notification failed" }, { status: 500 });
  }

  // Update team score (non-blocking, best-effort)
  recalculateAndUpsertTeamScore(db, teamId).catch((err) => {
    console.error("[mentor/grade] score upsert error", err);
  });

  return NextResponse.json({ review: reviewResult.data, inbox_count: inboxItems.length });
}
