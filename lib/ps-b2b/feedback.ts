import type {
  CRMFeedbackEvent,
  FeedbackLearningResult,
  ICPWeights,
  ScoreDimensionKey,
  SegmentConversionMetrics,
} from "@/lib/ps-b2b/types";

const DIMENSIONS: ScoreDimensionKey[] = [
  "budgetStrength",
  "problemUrgency",
  "innovationOpenness",
  "alignment",
  "easeOfAccess",
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeWeights(weights: ICPWeights): ICPWeights {
  const total =
    weights.budgetStrength +
    weights.problemUrgency +
    weights.innovationOpenness +
    weights.alignment +
    weights.easeOfAccess;

  if (total <= 0) {
    return {
      budgetStrength: 25,
      problemUrgency: 25,
      innovationOpenness: 20,
      alignment: 20,
      easeOfAccess: 10,
    };
  }

  const scaled: ICPWeights = {
    budgetStrength: (weights.budgetStrength / total) * 100,
    problemUrgency: (weights.problemUrgency / total) * 100,
    innovationOpenness: (weights.innovationOpenness / total) * 100,
    alignment: (weights.alignment / total) * 100,
    easeOfAccess: (weights.easeOfAccess / total) * 100,
  };

  return {
    budgetStrength: round2(scaled.budgetStrength),
    problemUrgency: round2(scaled.problemUrgency),
    innovationOpenness: round2(scaled.innovationOpenness),
    alignment: round2(scaled.alignment),
    easeOfAccess: round2(scaled.easeOfAccess),
  };
}

function dimensionFromRejectionReason(reason: string): ScoreDimensionKey | null {
  const normalized = reason.toLowerCase();
  if (normalized.includes("budget") || normalized.includes("price")) return "budgetStrength";
  if (normalized.includes("timing") || normalized.includes("urgent") || normalized.includes("priority")) {
    return "problemUrgency";
  }
  if (normalized.includes("innovation") || normalized.includes("ai") || normalized.includes("traditional")) {
    return "innovationOpenness";
  }
  if (normalized.includes("fit") || normalized.includes("relevant") || normalized.includes("alignment")) {
    return "alignment";
  }
  if (normalized.includes("access") || normalized.includes("contact") || normalized.includes("reply")) {
    return "easeOfAccess";
  }
  return null;
}

function initSegmentMetrics(): SegmentConversionMetrics {
  return {
    total: 0,
    replies: 0,
    meetingsBooked: 0,
    won: 0,
    rejected: 0,
    noResponse: 0,
    replyRate: 0,
    meetingRate: 0,
    winRate: 0,
  };
}

function buildMessagingInsights(
  objectionFrequency: Record<string, number>,
  delta: Record<ScoreDimensionKey, number>,
): string[] {
  const insights: string[] = [];
  const objectionEntries = Object.entries(objectionFrequency).sort((a, b) => b[1] - a[1]);

  if (objectionEntries.length > 0) {
    const [topReason, count] = objectionEntries[0];
    insights.push(`Most common objection: "${topReason}" (${count} time${count > 1 ? "s" : ""}).`);
  }

  const strongestPositive = DIMENSIONS.reduce((best, current) =>
    delta[current] > delta[best] ? current : best
  , DIMENSIONS[0]);

  if (delta[strongestPositive] > 0) {
    insights.push(`Weight increased most for ${strongestPositive}; prioritize this signal in targeting.`);
  }

  return insights;
}

export function applyFeedbackLearning(
  currentWeights: ICPWeights,
  events: CRMFeedbackEvent[],
): FeedbackLearningResult {
  const adjustment: Record<ScoreDimensionKey, number> = {
    budgetStrength: 0,
    problemUrgency: 0,
    innovationOpenness: 0,
    alignment: 0,
    easeOfAccess: 0,
  };

  const objectionFrequency: Record<string, number> = {};
  const segmentConversion: Record<string, SegmentConversionMetrics> = {};

  for (const event of events) {
    const segmentKey = event.segmentKey || "unknown";
    segmentConversion[segmentKey] = segmentConversion[segmentKey] || initSegmentMetrics();
    segmentConversion[segmentKey].total += 1;

    if (
      event.outcome === "positive_reply" ||
      event.outcome === "meeting_booked" ||
      event.outcome === "closed_won"
    ) {
      segmentConversion[segmentKey].replies += 1;
      if (event.outcome === "meeting_booked") segmentConversion[segmentKey].meetingsBooked += 1;
      if (event.outcome === "closed_won") segmentConversion[segmentKey].won += 1;

      const eventFactor = event.outcome === "closed_won" ? 1.4 : event.outcome === "meeting_booked" ? 1.2 : 1;
      for (const dimension of DIMENSIONS) {
        const snapshotScore = event.scoreSnapshot?.[dimension];
        if (snapshotScore === undefined) continue;
        if (snapshotScore >= 75) adjustment[dimension] += 1.2 * eventFactor;
        else if (snapshotScore >= 60) adjustment[dimension] += 0.6 * eventFactor;
        else if (snapshotScore < 40) adjustment[dimension] -= 0.7 * eventFactor;
      }
      continue;
    }

    if (event.outcome === "rejected") {
      segmentConversion[segmentKey].rejected += 1;
      const reason = (event.rejectionReason || "unspecified").trim().toLowerCase();
      objectionFrequency[reason] = (objectionFrequency[reason] || 0) + 1;
      const mappedDimension = dimensionFromRejectionReason(reason);
      if (mappedDimension) {
        adjustment[mappedDimension] -= 2.5;
      } else {
        for (const dimension of DIMENSIONS) adjustment[dimension] -= 0.3;
      }
      continue;
    }

    if (event.outcome === "no_response") {
      segmentConversion[segmentKey].noResponse += 1;
      if ((event.scoreSnapshot?.easeOfAccess ?? 0) < 60) {
        adjustment.easeOfAccess += 0.8;
      } else {
        adjustment.alignment += 0.4;
      }
    }
  }

  for (const segment of Object.values(segmentConversion)) {
    const total = Math.max(segment.total, 1);
    segment.replyRate = round2((segment.replies / total) * 100);
    segment.meetingRate = round2((segment.meetingsBooked / total) * 100);
    segment.winRate = round2((segment.won / total) * 100);
  }

  const adjusted: ICPWeights = {
    budgetStrength: clamp(currentWeights.budgetStrength + adjustment.budgetStrength, 5, 45),
    problemUrgency: clamp(currentWeights.problemUrgency + adjustment.problemUrgency, 5, 45),
    innovationOpenness: clamp(currentWeights.innovationOpenness + adjustment.innovationOpenness, 5, 40),
    alignment: clamp(currentWeights.alignment + adjustment.alignment, 5, 40),
    easeOfAccess: clamp(currentWeights.easeOfAccess + adjustment.easeOfAccess, 5, 30),
  };

  const updatedWeights = normalizeWeights(adjusted);
  const weightDelta: Record<ScoreDimensionKey, number> = {
    budgetStrength: round2(updatedWeights.budgetStrength - currentWeights.budgetStrength),
    problemUrgency: round2(updatedWeights.problemUrgency - currentWeights.problemUrgency),
    innovationOpenness: round2(updatedWeights.innovationOpenness - currentWeights.innovationOpenness),
    alignment: round2(updatedWeights.alignment - currentWeights.alignment),
    easeOfAccess: round2(updatedWeights.easeOfAccess - currentWeights.easeOfAccess),
  };

  const messagingInsights = buildMessagingInsights(objectionFrequency, weightDelta);

  return {
    updatedWeights,
    weightDelta,
    objectionFrequency,
    segmentConversion,
    messagingInsights,
  };
}
