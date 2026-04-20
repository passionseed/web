import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  buildReviewInboxItems,
  normalizeScoreAwarded,
  reviewStatusToSubmissionStatus,
  type HackathonReviewStatus,
  type HackathonSubmissionScope,
} from "@/lib/hackathon/admin-submissions";

const reviewSchema = z.object({
  review_status: z.enum(["pending_review", "passed", "revision_required"]),
  score_awarded: z.union([z.number(), z.string(), z.null()]).optional(),
  feedback: z.string().max(5000).optional(),
});

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

async function getRecipientParticipantIds(params: {
  serviceClient: any;
  scope: HackathonSubmissionScope;
  submission: any;
}) {
  if (params.scope === "individual") {
    return [params.submission.participant_id].filter(Boolean);
  }

  const { data, error } = await params.serviceClient
    .from("hackathon_team_members")
    .select("participant_id")
    .eq("team_id", params.submission.team_id);

  if (error) throw error;
  return ((data ?? []) as Array<{ participant_id: string }>).map((member) => member.participant_id).filter(Boolean);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scope: string; id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { scope: rawScope, id } = await params;
  if (rawScope !== "individual" && rawScope !== "team") {
    return NextResponse.json({ error: "Invalid submission scope" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload" }, { status: 400 });
  }

  const scope = rawScope as HackathonSubmissionScope;
  const serviceClient = getHackathonServiceClient();
  const table =
    scope === "individual"
      ? "hackathon_phase_activity_submissions"
      : "hackathon_phase_activity_team_submissions";

  const { data: submission, error: submissionError } = await serviceClient
    .from(table)
    .select(`
      *,
      hackathon_phase_activities(id, title),
      hackathon_phase_activity_assessments(id, points_possible)
    `)
    .eq("id", id)
    .single();

  if (submissionError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const activity = pickOne((submission as any).hackathon_phase_activities);
  const assessment = pickOne((submission as any).hackathon_phase_activity_assessments);
  const pointsPossible =
    typeof assessment?.points_possible === "number" ? assessment.points_possible : null;
  const scoreAwarded = normalizeScoreAwarded(parsed.data.score_awarded ?? null, pointsPossible);
  const feedback = parsed.data.feedback?.trim() ?? "";
  const reviewStatus = parsed.data.review_status as HackathonReviewStatus;
  const now = new Date().toISOString();

  const recipientParticipantIds = await getRecipientParticipantIds({
    serviceClient,
    scope,
    submission,
  });

  if (recipientParticipantIds.length === 0) {
    return NextResponse.json({ error: "No participants found for submission" }, { status: 400 });
  }

  const reviewTarget =
    scope === "individual"
      ? { individual_submission_id: id, team_submission_id: null }
      : { individual_submission_id: null, team_submission_id: id };

  const reviewKey =
    scope === "individual"
      ? { column: "individual_submission_id", value: id }
      : { column: "team_submission_id", value: id };

  const { data: existingReview, error: existingReviewError } = await serviceClient
    .from("hackathon_submission_reviews")
    .select("id")
    .eq(reviewKey.column, reviewKey.value)
    .maybeSingle();

  if (existingReviewError) {
    console.error("[admin/hackathon/submissions/review] review lookup error", existingReviewError);
    return NextResponse.json({ error: "Failed to check existing review" }, { status: 500 });
  }

  const reviewPayload = {
    submission_scope: scope,
    ...reviewTarget,
    review_status: reviewStatus,
    score_awarded: scoreAwarded,
    points_possible: pointsPossible,
    feedback,
    reviewed_by_user_id: admin.id,
    reviewed_at: now,
    // Any manual review clears the pending AI draft — it's been acted upon.
    ai_draft: null,
    ai_draft_generated_at: null,
    ai_draft_model: null,
    ai_draft_source: null,
  };

  const reviewResult = existingReview
    ? await serviceClient
        .from("hackathon_submission_reviews")
        .update(reviewPayload)
        .eq("id", existingReview.id)
        .select("*")
        .single()
    : await serviceClient
        .from("hackathon_submission_reviews")
        .insert(reviewPayload)
        .select("*")
        .single();

  if (reviewResult.error) {
    console.error("[admin/hackathon/submissions/review] review save error", reviewResult.error);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }

  const { error: submissionUpdateError } = await serviceClient
    .from(table)
    .update({
      status: reviewStatusToSubmissionStatus(reviewStatus),
      updated_at: now,
    })
    .eq("id", id);

  if (submissionUpdateError) {
    console.error("[admin/hackathon/submissions/review] submission status error", submissionUpdateError);
    return NextResponse.json({ error: "Review saved, but submission status update failed" }, { status: 500 });
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

  const { error: inboxError } = await serviceClient
    .from("hackathon_participant_inbox_items")
    .insert(inboxItems);

  if (inboxError) {
    console.error("[admin/hackathon/submissions/review] inbox insert error", inboxError);
    return NextResponse.json({ error: "Review saved, but inbox notification failed" }, { status: 500 });
  }

  const { count: pushTokenCount } = await serviceClient
    .from("hackathon_participant_push_tokens")
    .select("id", { count: "exact", head: true })
    .in("participant_id", recipientParticipantIds);

  return NextResponse.json({
    review: reviewResult.data,
    inbox_count: inboxItems.length,
    push_target_count: pushTokenCount ?? 0,
  });
}
