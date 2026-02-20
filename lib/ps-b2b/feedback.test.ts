import { applyFeedbackLearning } from "@/lib/ps-b2b/feedback";
import { getDefaultICPWeights } from "@/lib/ps-b2b/scoring";
import type { CRMFeedbackEvent } from "@/lib/ps-b2b/types";

describe("applyFeedbackLearning", () => {
  it("updates weights, tracks objections, and keeps weights normalized", () => {
    const initial = getDefaultICPWeights();

    const events: CRMFeedbackEvent[] = [
      {
        leadId: "lead-1",
        segmentKey: "thailand-private-high-school",
        outcome: "meeting_booked",
        scoreSnapshot: {
          budgetStrength: 72,
          problemUrgency: 68,
          innovationOpenness: 80,
          alignment: 84,
          easeOfAccess: 86,
        },
      },
      {
        leadId: "lead-2",
        segmentKey: "thailand-private-high-school",
        outcome: "positive_reply",
        scoreSnapshot: {
          budgetStrength: 65,
          problemUrgency: 75,
          innovationOpenness: 74,
          alignment: 82,
          easeOfAccess: 70,
        },
      },
      {
        leadId: "lead-3",
        segmentKey: "regional-boarding",
        outcome: "rejected",
        rejectionReason: "No budget cycle this year",
        scoreSnapshot: {
          budgetStrength: 38,
          problemUrgency: 63,
          innovationOpenness: 71,
          alignment: 79,
          easeOfAccess: 55,
        },
      },
    ];

    const learned = applyFeedbackLearning(initial, events);
    const sum =
      learned.updatedWeights.budgetStrength +
      learned.updatedWeights.problemUrgency +
      learned.updatedWeights.innovationOpenness +
      learned.updatedWeights.alignment +
      learned.updatedWeights.easeOfAccess;

    expect(sum).toBeCloseTo(100, 5);
    expect(learned.updatedWeights.easeOfAccess).toBeGreaterThan(initial.easeOfAccess);
    expect(learned.objectionFrequency["no budget cycle this year"]).toBe(1);
    expect(learned.segmentConversion["thailand-private-high-school"].meetingsBooked).toBe(1);
  });
});
