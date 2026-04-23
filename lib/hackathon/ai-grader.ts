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

import {
  buildReviewInboxItems,
  reviewStatusToSubmissionStatus,
} from "@/lib/hackathon/admin-submissions";

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
  /** When true, skip auto-approve and always keep as draft for human review. */
  forceReview?: boolean;
  /**
   * If provided, the generated review is attributed to this admin when
   * auto-approved. For auto_on_submit and bulk, leave undefined — the review
   * is system-generated and stays attributed to the null user.
   */
  reviewedByUserId?: string | null;
};

/**
 * Auto-approve rule: AI said passed → promote + notify, no admin click.
 * Applies to both graded (any score the AI chose to award) and ungraded
 * activities. `revision_required` and unparseable outputs still wait for a
 * human to click Approve/Edit/Discard.
 */
export function maybeAutoApprove(draft: AiDraft): boolean {
  return draft.status === "passed";
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
  const { scope, submissionId, draft, source, model, forceReview, reviewedByUserId } = opts;
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

  const promote = !forceReview && maybeAutoApprove(draft);

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
    // Keep the submission row's `status` in sync with the promoted review
    // AND insert inbox items so the student is actually notified — same as
    // the manual admin-review path. Without this step, auto-approve would
    // save silently and the student would never know their submission passed.
    const table =
      scope === "individual"
        ? "hackathon_phase_activity_submissions"
        : "hackathon_phase_activity_team_submissions";

    // Look up the minimum we need to build inbox items + figure out recipients.
    const { data: subRow } = await serviceClient
      .from(table)
      .select(
        scope === "individual"
          ? "id, activity_id, participant_id"
          : "id, activity_id, team_id"
      )
      .eq("id", submissionId)
      .single();

    const activityId = (subRow as any)?.activity_id ?? null;

    // Fetch team members (if team scope) and the activity title in parallel.
    const [participantIds, activityTitle] = await Promise.all([
      (async (): Promise<string[]> => {
        if (scope === "individual") {
          const pid = (subRow as any)?.participant_id;
          return pid ? [pid] : [];
        }
        const teamId = (subRow as any)?.team_id;
        if (!teamId) return [];
        const { data } = await serviceClient
          .from("hackathon_team_members")
          .select("participant_id")
          .eq("team_id", teamId);
        return ((data ?? []) as Array<{ participant_id: string }>)
          .map((m) => m.participant_id)
          .filter(Boolean);
      })(),
      (async (): Promise<string> => {
        if (!activityId) return "Hackathon submission";
        const { data } = await serviceClient
          .from("hackathon_phase_activities")
          .select("title")
          .eq("id", activityId)
          .maybeSingle();
        return ((data as any)?.title as string) || "Hackathon submission";
      })(),
    ]);

    const inboxItems =
      participantIds.length > 0
        ? buildReviewInboxItems({
            submissionScope: scope,
            recipientParticipantIds: participantIds,
            activityTitle,
            reviewStatus: draft.status as any,
            scoreAwarded: draft.score_awarded,
            pointsPossible: draft.points_possible,
            feedback: draft.feedback,
            submissionId,
          })
        : [];

    // Run submission-status update + inbox insert in parallel.
    const [subUpdate, inboxInsert] = await Promise.all([
      serviceClient
        .from(table)
        .update({
          status: reviewStatusToSubmissionStatus(draft.status as any),
          updated_at: now,
        })
        .eq("id", submissionId),
      inboxItems.length > 0
        ? serviceClient.from("hackathon_participant_inbox_items").insert(inboxItems)
        : Promise.resolve({ error: null }),
    ]);

    if (subUpdate.error) {
      console.error("[ai-grader.persistDraft] submission status update failed", subUpdate.error);
    }
    if (inboxInsert.error) {
      console.error("[ai-grader.persistDraft] inbox notify failed", inboxInsert.error);
    }
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
