export type HackathonReviewStatus = "pending_review" | "passed" | "revision_required";
export type HackathonSubmissionScope = "individual" | "team";

export interface ReviewInboxInput {
  submissionScope: HackathonSubmissionScope;
  recipientParticipantIds: string[];
  activityTitle: string;
  reviewStatus: HackathonReviewStatus;
  scoreAwarded: number | null;
  pointsPossible: number | null;
  feedback: string;
  submissionId: string;
}

export interface ReviewInboxItemInsert {
  participant_id: string;
  type: "assessment_review";
  title: string;
  body: string;
  action_url: string;
  metadata: {
    submission_scope: HackathonSubmissionScope;
    submission_id: string;
    review_status: HackathonReviewStatus;
    score_awarded: number | null;
    points_possible: number | null;
    activity_title: string;
  };
}

const REVIEW_STATUS_LABELS: Record<HackathonReviewStatus, string> = {
  pending_review: "Pending review",
  passed: "Passed",
  revision_required: "Needs revision",
};

export function reviewStatusToSubmissionStatus(status: HackathonReviewStatus): string {
  return status;
}

export function formatSubmissionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_review: "Pending review",
    passed: "Passed",
    revision_required: "Needs revision",
    submitted: "Submitted",
    draft: "Draft",
  };
  return labels[status] || status.replace(/_/g, " ");
}

export function normalizeScoreAwarded(value: unknown, pointsPossible: number | null): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;

  const rounded = Math.round(parsed);
  const minBounded = Math.max(0, rounded);

  if (typeof pointsPossible === "number" && Number.isFinite(pointsPossible)) {
    return Math.min(minBounded, Math.max(0, pointsPossible));
  }

  return minBounded;
}

export function buildReviewInboxItems(input: ReviewInboxInput): ReviewInboxItemInsert[] {
  const statusLabel = REVIEW_STATUS_LABELS[input.reviewStatus];
  const scoreText =
    input.scoreAwarded !== null && input.pointsPossible !== null
      ? ` Score: ${input.scoreAwarded}/${input.pointsPossible}.`
      : "";
  const feedbackText = input.feedback.trim();
  const body = `${statusLabel}.${scoreText}${feedbackText ? ` ${feedbackText}` : ""}`;

  return input.recipientParticipantIds.map((participantId) => ({
    participant_id: participantId,
    type: "assessment_review",
    title: `${input.activityTitle} reviewed`,
    body,
    action_url: "/hackathon/dashboard",
    metadata: {
      submission_scope: input.submissionScope,
      submission_id: input.submissionId,
      review_status: input.reviewStatus,
      score_awarded: input.scoreAwarded,
      points_possible: input.pointsPossible,
      activity_title: input.activityTitle,
    },
  }));
}
