/**
 * Shared helpers for persisting AI grading drafts.
 *
 * A "draft" is an AI-generated grade proposal stored in
 * hackathon_submission_reviews.ai_draft. It is never the authoritative review
 * for the student — the admin must Approve it (which promotes the draft into
 * the live review_status/score/feedback columns) or Discard it (which nulls
 * out ai_draft) or Edit it (client-side, then approves).
 *
 * Exception: if `maybeAutoApprove` is satisfied, `persistDraft` promotes the
 * draft to a live review in the same write. This fires only for graded
 * activities where the AI awards full points. Ungraded activities and
 * partial-score grades always wait for human approval.
 */

import { reviewStatusToSubmissionStatus } from "@/lib/hackathon/admin-submissions";

export type AiDraftStatus = "passed" | "revision_required" | "pending_review";
export type AiDraftSource = "manual" | "bulk" | "auto_on_submit";

export type AiDraft = {
  status: AiDraftStatus;
  score_awarded: number | null;
  points_possible: number | null;
  feedback: string;
  reasoning: string | null;
  raw_output: string;
  error: string | null;
};

export type PersistDraftOptions = {
  scope: "individual" | "team";
  submissionId: string;
  draft: AiDraft;
  source: AiDraftSource;
  model: string;
  /**
   * If provided, the generated review is attributed to this admin when
   * auto-approved. For auto_on_submit and bulk, leave undefined — the review
   * is system-generated and stays attributed to the null user.
   */
  reviewedByUserId?: string | null;
};

/**
 * Auto-approve rule: graded activity, AI said passed, full points awarded.
 * This is the ONLY path that lets AI write a real review without human click.
 */
export function maybeAutoApprove(draft: AiDraft): boolean {
  if (draft.status !== "passed") return false;
  if (draft.points_possible == null || draft.score_awarded == null) return false;
  return draft.score_awarded >= draft.points_possible;
}

/**
 * Upsert the review row with an AI draft. If maybeAutoApprove is true, the
 * draft is also promoted into the live review columns in the same write, and
 * ai_draft is cleared.
 */
export async function persistDraft(
  serviceClient: any,
  opts: PersistDraftOptions
): Promise<{ promoted: boolean; reviewId: string | null }> {
  const { scope, submissionId, draft, source, model, reviewedByUserId } = opts;
  const now = new Date().toISOString();

  const reviewKey =
    scope === "individual"
      ? { column: "individual_submission_id", value: submissionId }
      : { column: "team_submission_id", value: submissionId };

  const target =
    scope === "individual"
      ? { individual_submission_id: submissionId, team_submission_id: null }
      : { individual_submission_id: null, team_submission_id: submissionId };

  const { data: existing } = await serviceClient
    .from("hackathon_submission_reviews")
    .select("id")
    .eq(reviewKey.column, reviewKey.value)
    .maybeSingle();

  const promote = maybeAutoApprove(draft);

  const payload: Record<string, unknown> = {
    submission_scope: scope,
    ...target,
    ai_draft: promote ? null : (draft as unknown as Record<string, unknown>),
    ai_draft_generated_at: promote ? null : now,
    ai_draft_model: promote ? null : model,
    ai_draft_source: promote ? null : source,
  };

  if (promote) {
    payload.review_status = draft.status;
    payload.score_awarded = draft.score_awarded;
    payload.points_possible = draft.points_possible;
    payload.feedback = draft.feedback;
    payload.reviewed_by_user_id = reviewedByUserId ?? null;
    payload.reviewed_at = now;
  } else if (!existing) {
    // For drafts we still need a review_status since the column is likely NOT NULL.
    // Keep it as pending_review until an admin acts.
    payload.review_status = "pending_review";
    payload.points_possible = draft.points_possible;
  }

  const result = existing
    ? await serviceClient
        .from("hackathon_submission_reviews")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single()
    : await serviceClient
        .from("hackathon_submission_reviews")
        .insert(payload)
        .select("id")
        .single();

  if (result.error) {
    console.error("[ai-grader.persistDraft] upsert failed", result.error);
    throw result.error;
  }

  if (promote) {
    // Keep the submission row's `status` in sync with the promoted review.
    const table =
      scope === "individual"
        ? "hackathon_phase_activity_submissions"
        : "hackathon_phase_activity_team_submissions";
    await serviceClient
      .from(table)
      .update({
        status: reviewStatusToSubmissionStatus(draft.status as any),
        updated_at: now,
      })
      .eq("id", submissionId);
  }

  return { promoted: promote, reviewId: (result.data as any)?.id ?? null };
}

/**
 * Clears the AI draft without touching the live review fields. Used by the
 * Discard button and, implicitly, by the review POST endpoint after an admin
 * manually approves.
 */
export async function clearDraft(
  serviceClient: any,
  scope: "individual" | "team",
  submissionId: string
): Promise<void> {
  const reviewKey =
    scope === "individual"
      ? { column: "individual_submission_id", value: submissionId }
      : { column: "team_submission_id", value: submissionId };

  const { data: existing } = await serviceClient
    .from("hackathon_submission_reviews")
    .select("id")
    .eq(reviewKey.column, reviewKey.value)
    .maybeSingle();

  if (!existing) return;

  await serviceClient
    .from("hackathon_submission_reviews")
    .update({
      ai_draft: null,
      ai_draft_generated_at: null,
      ai_draft_model: null,
      ai_draft_source: null,
    })
    .eq("id", existing.id);
}
