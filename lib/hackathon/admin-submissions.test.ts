import {
  buildReviewInboxItems,
  normalizeScoreAwarded,
  reviewStatusToSubmissionStatus,
} from "./admin-submissions";

describe("hackathon admin submission helpers", () => {
  it("maps review decisions to the submission status participants see", () => {
    expect(reviewStatusToSubmissionStatus("passed")).toBe("passed");
    expect(reviewStatusToSubmissionStatus("revision_required")).toBe("revision_required");
    expect(reviewStatusToSubmissionStatus("pending_review")).toBe("pending_review");
  });

  it("normalizes score input without exceeding the assessment max", () => {
    expect(normalizeScoreAwarded(8, 10)).toBe(8);
    expect(normalizeScoreAwarded("7", 10)).toBe(7);
    expect(normalizeScoreAwarded("", 10)).toBeNull();
    expect(normalizeScoreAwarded(null, 10)).toBeNull();
    expect(normalizeScoreAwarded(12, 10)).toBe(10);
    expect(normalizeScoreAwarded(-3, 10)).toBe(0);
  });

  it("builds one inbox item for an individual submission review", () => {
    const items = buildReviewInboxItems({
      submissionScope: "individual",
      recipientParticipantIds: ["participant-1"],
      activityTitle: "Problem Discovery",
      reviewStatus: "passed",
      scoreAwarded: 8,
      pointsPossible: 10,
      feedback: "Clear research and strong evidence.",
      submissionId: "submission-1",
    });

    expect(items).toEqual([
      {
        participant_id: "participant-1",
        type: "assessment_review",
        title: "Problem Discovery reviewed",
        body: "Passed. Score: 8/10. Clear research and strong evidence.",
        action_url: "/hackathon/dashboard",
        metadata: {
          submission_scope: "individual",
          submission_id: "submission-1",
          review_status: "passed",
          score_awarded: 8,
          points_possible: 10,
          activity_title: "Problem Discovery",
        },
      },
    ]);
  });

  it("builds inbox items for every team member on team submission reviews", () => {
    const items = buildReviewInboxItems({
      submissionScope: "team",
      recipientParticipantIds: ["participant-1", "participant-2"],
      activityTitle: "Pitch Deck",
      reviewStatus: "revision_required",
      scoreAwarded: null,
      pointsPossible: 15,
      feedback: "Add clearer customer evidence.",
      submissionId: "submission-team-1",
    });

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.participant_id)).toEqual(["participant-1", "participant-2"]);
    expect(items[0].body).toBe("Needs revision. Add clearer customer evidence.");
    expect(items[0].metadata.submission_scope).toBe("team");
  });
});
